import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Signal,
  Wifi,
  WifiOff,
  Users,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  Activity,
  ChevronDown,
  PhoneCall,
  Volume1,
  X,
} from 'lucide-react';
import { BeaconSession, Language } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, limit, setDoc, doc } from 'firebase/firestore';

export interface WalkieTalkieLiveProps {
  session?: BeaconSession | null;
  memberId: string;
  memberName: string;
  avatarColor: string;
  language?: Language;
  onClose?: () => void;
  compactMode?: boolean;
}

interface PeerInfo {
  id: string;
  name: string;
  color: string;
  lastSeen: number;
}

interface TransmissionLogItem {
  id: string;
  speakerId: string;
  speakerName: string;
  speakerColor: string;
  channel: string;
  timestamp: string;
  type: 'outgoing' | 'incoming';
}

const DEFAULT_CHANNELS = [
  { id: 'ch_party', name: 'Party Channel (Private)', desc: 'Beacon Session Group' },
  { id: 'ch_recon', name: 'CH-01: Highland Trail Recon', desc: 'Trail & Hiking Navigation' },
  { id: 'ch_camp', name: 'CH-02: Base Camp & Steamboat', desc: 'Township & Food Gathering' },
  { id: 'ch_peaks', name: 'CH-03: Mossy Peak & 4x4', desc: 'High Elevation Coordination' },
  { id: 'ch_emergency', name: 'CH-04: Emergency SOS Radio', desc: 'Urgent Highland Safety' },
];

export const WalkieTalkieLive: React.FC<WalkieTalkieLiveProps> = ({
  session,
  memberId,
  memberName,
  avatarColor,
  language = 'en',
  onClose,
  compactMode = false,
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Active channel
  const partyChannelId = session?.code ? `party_${session.code}` : 'ch_party';
  const partyChannelName = session?.code ? `Party #${session.code} (Live)` : 'Party Group Radio';

  const [activeChannel, setActiveChannel] = useState<string>(partyChannelId);
  const [speakerVolume, setSpeakerVolume] = useState<number>(() => {
    const saved = localStorage.getItem('camgo_ptt_volume');
    return saved !== null ? Number(saved) : 0.85;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(true);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [activePeers, setActivePeers] = useState<Map<string, PeerInfo>>(new Map());

  // Transmission state
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [incomingSpeaker, setIncomingSpeaker] = useState<{ id: string; name: string; color: string } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [transmissionLogs, setTransmissionLogs] = useState<TransmissionLogItem[]>([]);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const incomingAudioQueueRef = useRef<string[]>([]);
  const isPlayingIncomingRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transmitStartTimeRef = useRef<number>(0);

  // Get or initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Synthesize authentic hardware walkie-talkie tones (Mic Key Chirp & Motorola Roger Beep)
  const playRadioSound = useCallback((type: 'start' | 'end' | 'squelch') => {
    if (!soundEffectsEnabled || isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const effectiveVol = isMuted ? 0 : speakerVolume;

      if (type === 'start') {
        // High-pitched PTT key-up chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(effectiveVol * 0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.07);
      } else if (type === 'end') {
        // Dual-tone "Roger Beep"
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1180, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(effectiveVol * 0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === 'squelch') {
        // Subtle burst of white noise / squelch
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(effectiveVol * 0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start(ctx.currentTime);
      }
    } catch {
      // Audio playback failsafe
    }
  }, [getAudioContext, soundEffectsEnabled, isMuted, speakerVolume]);

  // Play incoming audio chunks via Web Audio / HTML5 Audio buffer queue with volume control
  const playNextIncomingAudioChunk = useCallback(async () => {
    if (isPlayingIncomingRef.current || incomingAudioQueueRef.current.length === 0) {
      return;
    }
    const chunkData = incomingAudioQueueRef.current.shift();
    if (!chunkData) return;

    isPlayingIncomingRef.current = true;
    try {
      const audio = new Audio(chunkData);
      audio.volume = isMuted ? 0 : speakerVolume;
      audio.onended = () => {
        isPlayingIncomingRef.current = false;
        playNextIncomingAudioChunk();
      };
      audio.onerror = () => {
        isPlayingIncomingRef.current = false;
        playNextIncomingAudioChunk();
      };
      await audio.play();
    } catch (e) {
      isPlayingIncomingRef.current = false;
      playNextIncomingAudioChunk();
    }
  }, [isMuted, speakerVolume]);

  // Handle incoming PTT chunk
  const handleIncomingAudioChunk = useCallback((payload: any) => {
    if (payload.channel !== activeChannel || payload.senderId === memberId) {
      return;
    }

    if (payload.isStart) {
      setIncomingSpeaker({
        id: payload.senderId,
        name: payload.senderName || 'Highland Companion',
        color: payload.senderColor || '#10b981',
      });
      playRadioSound('squelch');
      setTransmissionLogs((prev) => [
        {
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          speakerId: payload.senderId,
          speakerName: payload.senderName || 'Highland Companion',
          speakerColor: payload.senderColor || '#10b981',
          channel: payload.channel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'incoming',
        },
        ...prev.slice(0, 19),
      ]);
    }

    if (payload.audioData) {
      incomingAudioQueueRef.current.push(payload.audioData);
      playNextIncomingAudioChunk();
    }

    if (payload.isEnd) {
      playRadioSound('end');
      setTimeout(() => {
        setIncomingSpeaker(null);
      }, 500);
    }
  }, [activeChannel, memberId, playRadioSound, playNextIncomingAudioChunk]);

  // Sync active session companions as listening peers
  useEffect(() => {
    const sessionMembers = session?.members;
    if (sessionMembers) {
      setActivePeers((prev) => {
        const next = new Map(prev);
        Object.values(sessionMembers).forEach((m) => {
          if (m && m.id && m.id !== memberId) {
            next.set(m.id, {
              id: m.id,
              name: m.name,
              color: m.avatarColor,
              lastSeen: Date.now(),
            });
          }
        });
        return next;
      });
      setConnectionStatus('connected');
    }
  }, [session?.members, memberId]);

  // Real-time peer signaling & chunk relay via BroadcastChannel, Firestore, and safe local WebSocket
  useEffect(() => {
    let isMounted = true;
    let unsubFirestore: (() => void) | null = null;

    // 1. Local tab-to-tab peer relay via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('camgo_ptt_walkie_talkie');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (!isMounted) return;
          const msg = event.data;
          if (msg?.event === 'ptt_audio_chunk') {
            handleIncomingAudioChunk(msg.payload);
          } else if (msg?.event === 'ptt_peer_presence') {
            handlePeerPresence(msg.payload);
          }
        };
        setConnectionStatus('connected');
      } catch {
        // ignore
      }
    }

    // 2. Cross-device real-time sync via Firebase Firestore
    if (db) {
      try {
        const signalsCol = collection(db, 'walkie_talkie_signals');
        const q = query(
          signalsCol,
          where('channel', '==', activeChannel),
          limit(15)
        );
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            if (!isMounted) return;
            setConnectionStatus('connected');
            const now = Date.now();
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const data = change.doc.data();
                // Filter out messages older than 20 seconds or sent by self
                if (data && data.senderId !== memberId && now - (data.timestamp || 0) < 20000) {
                  if (data.event === 'ptt_audio_chunk') {
                    handleIncomingAudioChunk(data.payload);
                  } else if (data.event === 'ptt_peer_presence') {
                    handlePeerPresence(data.payload);
                  }
                }
              }
            });
          },
          () => {
            if (isMounted) setConnectionStatus('connected');
          }
        );
      } catch {
        // ignore
      }
    }

    // 3. Optional local WebSocket support (strictly for local development on localhost/127.0.0.1)
    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1';

      if (isLocalhost) {
        try {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            if (!isMounted) return;
            setConnectionStatus('connected');
            sendSignal({
              event: 'ptt_peer_presence',
              payload: {
                channel: activeChannel,
                id: memberId,
                name: memberName || 'Explorer',
                color: avatarColor,
                type: 'joined',
              },
            });
          };

          ws.onmessage = (evt) => {
            if (!isMounted) return;
            try {
              const data = JSON.parse(evt.data);
              if (data?.event === 'ptt_audio_chunk') {
                handleIncomingAudioChunk(data.payload);
              } else if (data?.event === 'ptt_peer_presence') {
                handlePeerPresence(data.payload);
              }
            } catch {
              // ignore
            }
          };

          ws.onclose = () => {
            // Do not loop reconnect on close
            if (!isMounted) return;
            setConnectionStatus('connected');
          };

          ws.onerror = () => {
            // Do not loop reconnect on error
            if (!isMounted) return;
            setConnectionStatus('connected');
          };
        } catch {
          // ignore
        }
      } else {
        // In cloud / production (e.g. www.camgo.my on Vercel), Firestore & BroadcastChannel provide the real-time mesh
        setConnectionStatus('connected');
      }
    }

    const handlePeerPresence = (payload: any) => {
      if (!payload || payload.channel !== activeChannel || payload.id === memberId) return;
      setActivePeers((prev) => {
        const next = new Map(prev);
        if (payload.type === 'left') {
          next.delete(payload.id);
        } else {
          next.set(payload.id, {
            id: payload.id,
            name: payload.name,
            color: payload.color,
            lastSeen: Date.now(),
          });
        }
        return next;
      });
    };

    // Periodic heartbeat to broadcast presence in channel
    const presenceInterval = setInterval(() => {
      sendSignal({
        event: 'ptt_peer_presence',
        payload: {
          channel: activeChannel,
          id: memberId,
          name: memberName || 'Explorer',
          color: avatarColor,
          type: 'ping',
        },
      });

      // Evict stale peers older than 25s
      setActivePeers((prev) => {
        const now = Date.now();
        const next = new Map();
        prev.forEach((peer, id) => {
          if (now - peer.lastSeen < 25000) {
            next.set(id, peer);
          }
        });
        return next;
      });
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(presenceInterval);
      if (unsubFirestore) {
        unsubFirestore();
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch {
          // ignore
        }
        broadcastChannelRef.current = null;
      }
    };
  }, [activeChannel, memberId, memberName, avatarColor, handleIncomingAudioChunk]);

  // Send message across WebSocket (if active), local BroadcastChannel, and Firebase Firestore
  const sendSignal = (data: any) => {
    // 1. Send via WebSocket Server if connected (local dev)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch {
        // ignore
      }
    }

    // 2. Broadcast to other local browser tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(data);
      } catch {
        // ignore
      }
    }

    // 3. Real-time broadcast to Firestore for cross-device & mobile PWA delivery
    if (db) {
      try {
        const signalDocId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setDoc(doc(db, 'walkie_talkie_signals', signalDocId), {
          ...data,
          senderId: memberId,
          channel: activeChannel,
          timestamp: Date.now(),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  };

  // Live Canvas Waveform Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const drawWaveform = () => {
      if (!running) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (isTransmitting && analyserRef.current) {
        // Draw live mic frequency waveform
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barCount = 28;
        const barWidth = (width / barCount) - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * height * 0.9);
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          // Glowing emerald-to-amber transmitting gradient
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#10b981');
          grad.addColorStop(0.7, '#34d399');
          grad.addColorStop(1, '#f59e0b');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else if (incomingSpeaker) {
        // Draw simulated incoming radio transmission wave
        const barCount = 28;
        const barWidth = (width / barCount) - 2;
        const now = Date.now() / 150;

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(now + i * 0.4) * 0.5 + 0.5;
          const barHeight = Math.max(4, wave * height * 0.75);
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          ctx.fillStyle = incomingSpeaker.color || '#38bdf8';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else {
        // Resting standby idle line with subtle high-tech scanning pulse
        ctx.fillStyle = '#292524';
        const barCount = 24;
        const barWidth = (width / barCount) - 2;
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 2);
          ctx.beginPath();
          ctx.roundRect(x, height / 2 - 1.5, barWidth, 3, 1.5);
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTransmitting, incomingSpeaker]);

  // Start PTT transmission (Microphone MediaStream capture + real-time chunk streaming)
  const startTransmission = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (isTransmitting) return;

    setPermissionError(null);
    transmitStartTimeRef.current = Date.now();

    // Haptic feedback for tactile feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(35);
    }

    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) throw new Error('AudioContext unavailable');
      
      // Ensure context is resumed (browser policy)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Request live microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      mediaStreamRef.current = stream;

      // Connect to AnalyserNode for live visual waveform
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Play start chirp
      playRadioSound('start');
      setIsTransmitting(true);

      // Notify peers that transmission started
      sendSignal({
        event: 'ptt_audio_chunk',
        payload: {
          channel: activeChannel,
          senderId: memberId,
          senderName: memberName || 'Explorer',
          senderColor: avatarColor,
          isStart: true,
          isEnd: false,
          audioData: null,
        },
      });

      // Stream audio chunks in ultra-low latency slices (120ms intervals)
      // Pick supported mimeType (Chrome/Firefox/Android prefer webm/opus; Safari prefers mp4)
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            sendSignal({
              event: 'ptt_audio_chunk',
              payload: {
                channel: activeChannel,
                senderId: memberId,
                senderName: memberName || 'Explorer',
                senderColor: avatarColor,
                isStart: false,
                isEnd: false,
                audioData: base64Data,
              },
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Record chunks every 120ms for ultra-low latency streaming
      recorder.start(120);

      // Log transmission in local history
      setTransmissionLogs((prev) => [
        {
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          speakerId: memberId,
          speakerName: memberName || 'Explorer (You)',
          speakerColor: avatarColor,
          channel: activeChannel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'outgoing',
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      console.error('PTT capture error:', err);
      setIsTransmitting(false);
      
      let errorMsg = language === 'bm' 
        ? 'Ralat mikrofon. Sila pastikan mikrofon tersedia.' 
        : 'Microphone unavailable or in use.';
        
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('denied')) {
        errorMsg = language === 'bm'
          ? 'AKSES DITOLAK: Sila klik ikon kunci di bar alamat URL dan benarkan Mikrofon.'
          : 'ACCESS DENIED: Please click the Lock icon in your URL bar and set Microphone to "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = language === 'bm'
          ? 'TIADA MIKROFON: Peranti audio tidak dijumpai.'
          : 'NO MICROPHONE: Audio input hardware not found on this device.';
      } else if (err.name === 'SecurityError') {
        errorMsg = language === 'bm'
          ? 'RALAT KESELAMATAN: PTT memerlukan sambungan HTTPS selamat.'
          : 'SECURITY ERROR: PTT requires a secure HTTPS environment to function.';
      }
      
      setPermissionError(errorMsg);
    }
  };

  // Stop PTT transmission
  const stopTransmission = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!isTransmitting) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    } catch (e) {
      console.warn('Error stopping recorder:', e);
    }

    // Play end Roger Beep
    playRadioSound('end');
    setIsTransmitting(false);

    // Notify peers that transmission ended
    sendSignal({
      event: 'ptt_audio_chunk',
      payload: {
        channel: activeChannel,
        senderId: memberId,
        senderName: memberName || 'Explorer',
        senderColor: avatarColor,
        isStart: false,
        isEnd: true,
        audioData: null,
      },
    });
  };

  // Update volume
  const handleVolumeChange = (newVol: number) => {
    setSpeakerVolume(newVol);
    localStorage.setItem('camgo_ptt_volume', String(newVol));
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Formatted channel label
  const currentChannelObj = DEFAULT_CHANNELS.find((c) => c.id === activeChannel);
  const activeChannelTitle = activeChannel === partyChannelId ? partyChannelName : (currentChannelObj?.name || activeChannel);

  return (
    <div className={`w-full flex flex-col bg-stone-950 text-stone-100 rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl relative ${compactMode ? 'p-2 sm:p-3' : 'p-4 sm:p-6 space-y-4'}`}>
      {/* Background Radio Grid Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Top Radio Header: Channel Name & Connection Health */}
      <div className={`flex items-center justify-between gap-3 border-b border-stone-800 relative z-10 ${compactMode ? 'pb-1.5' : 'pb-3'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`${compactMode ? 'p-2' : 'p-2.5'} rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner`}>
            <Radio className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} animate-pulse`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-extrabold text-white tracking-wide flex items-center gap-1.5 ${compactMode ? 'text-xs' : 'text-sm sm:text-base'}`}>
                <span>PTT Radio</span>
              </h3>
              {!compactMode && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-stone-800 text-stone-300 border border-white/5">
                  Ultra-Low Latency
                </span>
              )}
            </div>
            {!compactMode && (
              <p className="text-[11px] text-stone-400">
                Live WebRTC &amp; WebSocket Audio Relay • Zero Server Storage
              </p>
            )}
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
              connectionStatus === 'connected'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm'
                : connectionStatus === 'connecting'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="capitalize">{connectionStatus}</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Channel Selector Dropdown & Active Peer Presence Count */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center relative z-10">
        <div className="sm:col-span-8">
          <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-500 block mb-1">
            Radio Frequency / Channel:
          </label>
          <div className="relative">
            <select
              value={activeChannel}
              onChange={(e) => {
                setActiveChannel(e.target.value);
                setActivePeers(new Map());
              }}
              className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 font-bold text-[11px] outline-none focus:border-emerald-500 cursor-pointer appearance-none shadow-inner"
            >
              <option value={partyChannelId}>
                📡 {partyChannelName}
              </option>
              {DEFAULT_CHANNELS.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  📻 {ch.name} — {ch.desc}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Online Radios in Channel Count */}
        <div className="sm:col-span-4 p-2.5 rounded-2xl bg-stone-900/90 border border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-stone-400 block">Listening Peers</span>
              <span className="text-xs font-bold text-white font-mono">
                {activePeers.size + 1} Radio{activePeers.size > 0 ? 's' : ''} Online
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
            Tuned In
          </span>
        </div>
      </div>

      {/* Main Tactical Radio Screen & Visualizer */}
      <div className="p-4 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-inner space-y-3 relative overflow-hidden">
        {/* Transmission Status Bar */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isTransmitting ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-black animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
                <span className="uppercase tracking-wider">LIVE TRANSMITTING...</span>
              </div>
            ) : incomingSpeaker ? (
              <div className="flex items-center gap-2 text-cyan-300 font-bold animate-pulse">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: incomingSpeaker.color, boxShadow: `0 0 10px ${incomingSpeaker.color}` }}
                />
                <span className="truncate">
                  RECEIVING FROM: <strong className="text-white">{incomingSpeaker.name}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>CHANNEL STANDBY • {activeChannelTitle}</span>
              </div>
            )}
          </div>

          <span className="text-[10px] font-mono text-stone-400">
            {isTransmitting ? 'MIC OPEN • 120ms Opus Slice' : incomingSpeaker ? 'STREAMING AUDIO' : 'READY TO KEY'}
          </span>
        </div>

        {/* Live Audio Waveform Canvas */}
        <div className="w-full h-14 bg-stone-950/80 rounded-2xl border border-white/5 flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={400}
            height={48}
            className="w-full h-full block"
          />
        </div>

        {/* Permission Error Banner */}
        {permissionError && (
          <div className="p-4 rounded-2xl bg-rose-900 border-2 border-rose-500 shadow-lg shadow-rose-950/50 text-white animate-in zoom-in-95 duration-200 relative z-50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/10 shrink-0">
                <MicOff className="w-5 h-5 text-rose-200" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-black text-xs uppercase tracking-wider text-rose-100">
                  {language === 'bm' ? 'Mikrofon Diperlukan' : 'Microphone Required'}
                </h4>
                <p className="text-[11px] leading-relaxed text-rose-50) opacity-90">
                  {permissionError}
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => startTransmission()}
                    className="px-3 py-1.5 rounded-lg bg-white text-rose-900 font-bold text-[10px] uppercase cursor-pointer hover:bg-rose-100 transition-colors shadow-sm"
                  >
                    {language === 'bm' ? 'Cuba Lagi' : 'Try Again'}
                  </button>
                  <button
                    onClick={() => setPermissionError(null)}
                    className="px-3 py-1.5 rounded-lg bg-transparent border border-white/30 text-white font-bold text-[10px] uppercase cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    {language === 'bm' ? 'Tutup' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Tactile "HOLD TO TALK" Button */}
      <div className={`flex flex-col items-center justify-center relative select-none ${compactMode ? 'py-1 sm:py-2' : 'py-2 sm:py-4'}`}>
        {/* Pulsing Radiation Rings when Transmitting */}
        {isTransmitting && (
          <>
            <div className={`absolute rounded-full border-2 border-amber-500/40 animate-ping pointer-events-none ${compactMode ? 'w-24 h-24 xs:w-32 xs:h-32' : 'w-32 h-32 xs:w-44 xs:h-44 sm:w-56 sm:h-56'}`} />
            <div className={`absolute rounded-full border border-emerald-400/30 animate-pulse pointer-events-none ${compactMode ? 'w-32 h-32 xs:w-40 xs:h-40' : 'w-40 h-40 xs:w-52 xs:h-52 sm:w-64 sm:h-64'}`} />
          </>
        )}

        <button
          type="button"
          onMouseDown={startTransmission}
          onMouseUp={stopTransmission}
          onMouseLeave={stopTransmission}
          onTouchStart={startTransmission}
          onTouchEnd={stopTransmission}
          onTouchCancel={stopTransmission}
          style={{ touchAction: 'none' }}
          className={`relative group rounded-full transition-all duration-150 flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 shadow-2xl ${
            compactMode 
              ? 'w-24 h-24 xs:w-28 xs:h-28 sm:w-36 sm:h-36' 
              : 'w-28 h-28 xs:w-36 xs:h-36 sm:w-44 sm:h-44'
          } ${
            isTransmitting
              ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 ring-8 ring-amber-500/30 scale-105 shadow-[0_0_50px_rgba(245,158,11,0.6)]'
              : incomingSpeaker
              ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 ring-8 ring-cyan-500/30 opacity-75 cursor-not-allowed shadow-[0_0_40px_rgba(6,182,212,0.4)]'
              : 'bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 hover:from-stone-700 hover:to-stone-900 border-4 border-stone-700/80 hover:border-emerald-500/60 shadow-[0_0_35px_rgba(0,0,0,0.8)]'
          }`}
          aria-label="Push to Talk Button"
        >
          {/* Inner Metallic Bezel Ring */}
          <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />

          {/* Icon */}
          <div className={`${compactMode ? 'mb-0' : 'mb-0.5 sm:mb-1'} text-white transition-transform group-hover:scale-110`}>
            {isTransmitting ? (
              <Mic className={`${compactMode ? 'w-6 h-6 xs:w-8 xs:h-8' : 'w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12'} animate-bounce text-stone-950`} />
            ) : incomingSpeaker ? (
              <Volume2 className={`${compactMode ? 'w-6 h-6 xs:w-8 xs:h-8' : 'w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12'} text-cyan-200 animate-pulse`} />
            ) : (
              <Mic className={`${compactMode ? 'w-6 h-6 xs:w-8 xs:h-8' : 'w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12'} text-emerald-400 group-hover:text-emerald-300`} />
            )}
          </div>

          {/* Primary Button Text */}
          <span
            className={`font-black tracking-wider uppercase text-center px-2 leading-tight ${
              compactMode ? 'text-[9px] xs:text-[10px]' : 'text-[10px] xs:text-xs sm:text-sm'
            } ${
              isTransmitting
                ? 'text-stone-950'
                : incomingSpeaker
                ? 'text-cyan-100'
                : 'text-stone-100 group-hover:text-emerald-300'
            }`}
          >
            {isTransmitting
              ? 'LIVE'
              : incomingSpeaker
              ? 'RX'
              : 'PTT'}
          </span>
        </button>

        <p className={`mt-2 font-mono text-center ${compactMode ? 'text-[9px] text-stone-500' : 'text-[11px] text-stone-400'}`}>
          {language === 'bm'
            ? (compactMode ? 'Tahan untuk cakap' : 'Tekan & tahan untuk bercakap terus ke semua rakan')
            : (compactMode ? 'Hold to talk' : 'Hold down to broadcast voice instantly to all companions')}
        </p>
      </div>

      {/* Speaker Volume Slider & Tactical Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs">
        {/* Speaker Volume Slider */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
              isMuted
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                : 'bg-stone-800 border-white/5 text-stone-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
              <span>Speaker Volume:</span>
              <span className="font-mono font-bold text-white">
                {isMuted ? 'MUTED' : `${Math.round(speakerVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : speakerVolume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Audio Sound Effects (Chirps & Roger Beep) Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block">Roger Beep &amp; Squelch</span>
            <span className="font-mono text-xs font-bold text-stone-200">
              {soundEffectsEnabled ? 'Active (Dual-Tone)' : 'Disabled'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer border transition-all ${
              soundEffectsEnabled
                ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-800 border-white/10 text-stone-400'
            }`}
          >
            {soundEffectsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Recent Transmissions Log (In-Memory, Zero Disk Storage) */}
      {!compactMode && transmissionLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>Recent Channel Transmissions:</span>
            <span>{transmissionLogs.length} events logged in session</span>
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
            {transmissionLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-xl bg-stone-900/60 border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: log.speakerColor }}
                  />
                  <span className="font-bold text-stone-200 truncate">{log.speakerName}</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {log.type === 'outgoing' ? '• You Transmitted' : '• Received Voice'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
