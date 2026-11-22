import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Signal,
  Wifi,
  Users,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  Activity,
  ChevronDown,
  X,
  Battery,
  Play,
  Pause,
  HelpCircle,
  Volume1,
  RotateCcw,
  Check,
} from 'lucide-react';
import { BeaconSession, Language, BeaconVoiceDispatch } from '../types';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { beaconService } from '../services/beaconService';
import { audioService } from '../services/audioService';

export interface WalkieTalkieLiveProps {
  session?: BeaconSession | null;
  memberId: string;
  memberName: string;
  avatarColor: string;
  language?: Language;
  onClose?: () => void;
  compactMode?: boolean;
  variant?: 'full' | 'dockedBar';
  onTabSwitchRequested?: () => void;
  onLiveSpeakerStateChange?: (speaker: { id: string; name: string; color: string; isSpeaking: boolean } | null) => void;
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
  audioData?: string;
  durationSec?: number;
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
  variant = 'full',
  onTabSwitchRequested,
  onLiveSpeakerStateChange,
}) => {
  // Active channel computation
  const partyChannelId = session?.code ? `party_${session.code}` : 'ch_party';
  const partyChannelName = session?.code ? `Party #${session.code} (Live)` : 'Party Group Radio';

  const [activeChannel, setActiveChannel] = useState<string>(partyChannelId);
  const [speakerVolume, setSpeakerVolume] = useState<number>(() => {
    const saved = localStorage.getItem('camgo_ptt_volume');
    return saved !== null ? Number(saved) : 0.9;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(true);
  const [speakerUnlocked, setSpeakerUnlocked] = useState<boolean>(() => {
    return audioService.getAudioState() === 'ready';
  });

  // Connection and Peers state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [activePeers, setActivePeers] = useState<Map<string, PeerInfo>>(new Map());

  // Transmission state
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [incomingSpeaker, setIncomingSpeaker] = useState<{ id: string; name: string; color: string } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [transmissionLogs, setTransmissionLogs] = useState<TransmissionLogItem[]>([]);
  const [transmissionToast, setTransmissionToast] = useState<{ message: string; type: 'start' | 'end' | 'receive' } | null>(null);
  const [showHowToUse, setShowHowToUse] = useState<boolean>(false);
  const [autoplayBlockedItem, setAutoplayBlockedItem] = useState<{ senderName: string; audioData: string } | null>(null);
  const [playingLogId, setPlayingLogId] = useState<string | null>(null);

  // Audio Processing Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedBlobsRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transmitStartTimeRef = useRef<number>(0);
  const toastTimerRef = useRef<any>(null);
  const lastPlayedDispatchIdRef = useRef<string | null>(null);
  const activePlayingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync active channel when session code changes
  useEffect(() => {
    if (session?.code) {
      setActiveChannel(`party_${session.code}`);
    }
  }, [session?.code]);

  // Toast feedback utility
  const showToast = useCallback((message: string, type: 'start' | 'end' | 'receive') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setTransmissionToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setTransmissionToast(null);
    }, 2800);
  }, []);

  // Web Audio Context helper
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  // Authentic Walkie-Talkie Sound Effects
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
      // Audio failsafe
    }
  }, [getAudioContext, soundEffectsEnabled, isMuted, speakerVolume]);

  // Test and unlock speaker explicitly
  const handleTestSpeaker = async () => {
    const success = await audioService.unlockAudio();
    audioService.playTestChime();
    setSpeakerUnlocked(true);
    setAutoplayBlockedItem(null);
    showToast(
      language === 'bm' ? '🔊 Pembesar Suara Berfungsi!' : '🔊 Speaker Unlocked & Tested!',
      'start'
    );
  };

  // Play audio payload cleanly
  const playIncomingVoiceDispatch = useCallback((dispatch: BeaconVoiceDispatch) => {
    if (!dispatch || !dispatch.audioData) return;
    if (dispatch.senderId === memberId) return;

    // Avoid replaying ancient messages upon initial page mount (older than 45s)
    if (Date.now() - (dispatch.timestamp || 0) > 45000) return;

    if (lastPlayedDispatchIdRef.current === dispatch.id) return;
    lastPlayedDispatchIdRef.current = dispatch.id;

    const speaker = {
      id: dispatch.senderId,
      name: dispatch.senderName || 'Companion',
      color: dispatch.senderColor || '#10b981',
    };

    setIncomingSpeaker(speaker);
    if (onLiveSpeakerStateChange) {
      onLiveSpeakerStateChange({ ...speaker, isSpeaking: true });
    }

    // Play initial squelch
    playRadioSound('squelch');

    // Add to history log
    setTransmissionLogs((prev) => [
      {
        id: dispatch.id,
        speakerId: dispatch.senderId,
        speakerName: dispatch.senderName,
        speakerColor: dispatch.senderColor || '#10b981',
        channel: activeChannel,
        timestamp: new Date(dispatch.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'incoming',
        audioData: dispatch.audioData,
        durationSec: dispatch.durationSec || 1,
      },
      ...prev.slice(0, 24),
    ]);

    showToast(`📻 ${dispatch.senderName}: Voice Message (${dispatch.durationSec}s)`, 'receive');

    try {
      const audio = new Audio(dispatch.audioData);
      audio.volume = isMuted ? 0 : speakerVolume;
      activePlayingAudioRef.current = audio;

      audio.onended = () => {
        playRadioSound('end'); // authentic roger beep
        setTimeout(() => {
          setIncomingSpeaker(null);
          if (onLiveSpeakerStateChange) {
            onLiveSpeakerStateChange(null);
          }
        }, 300);
      };

      audio.onerror = () => {
        setIncomingSpeaker(null);
        if (onLiveSpeakerStateChange) {
          onLiveSpeakerStateChange(null);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[WalkieTalkieLive] Autoplay notice:', err);
          setIncomingSpeaker(null);
          if (onLiveSpeakerStateChange) {
            onLiveSpeakerStateChange(null);
          }
          if (err.name === 'NotAllowedError') {
            setAutoplayBlockedItem({
              senderName: dispatch.senderName,
              audioData: dispatch.audioData,
            });
          }
        });
      }
    } catch (err) {
      console.warn('[WalkieTalkieLive] Audio instantiation error:', err);
      setIncomingSpeaker(null);
      if (onLiveSpeakerStateChange) {
        onLiveSpeakerStateChange(null);
      }
    }
  }, [memberId, activeChannel, isMuted, speakerVolume, playRadioSound, showToast, onLiveSpeakerStateChange]);

  // Replay a voice log item
  const handleReplayLogItem = (log: TransmissionLogItem) => {
    if (!log.audioData) return;

    if (activePlayingAudioRef.current) {
      activePlayingAudioRef.current.pause();
      activePlayingAudioRef.current = null;
    }

    if (playingLogId === log.id) {
      setPlayingLogId(null);
      return;
    }

    try {
      const audio = new Audio(log.audioData);
      audio.volume = isMuted ? 0 : speakerVolume;
      activePlayingAudioRef.current = audio;
      setPlayingLogId(log.id);

      audio.onended = () => {
        setPlayingLogId(null);
        activePlayingAudioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingLogId(null);
        activePlayingAudioRef.current = null;
      };

      audio.play().catch(() => {
        setPlayingLogId(null);
      });
    } catch {
      setPlayingLogId(null);
    }
  };

  // 1. Sync session live voice dispatch & active speaking presence in real-time
  useEffect(() => {
    if (!session) return;

    // Check live radio speaker
    if (session.liveRadioSpeaker && session.liveRadioSpeaker.id !== memberId) {
      const isRecent = Date.now() - (session.liveRadioSpeaker.timestamp || 0) < 15000;
      if (session.liveRadioSpeaker.isSpeaking && isRecent) {
        const spk = {
          id: session.liveRadioSpeaker.id,
          name: session.liveRadioSpeaker.name,
          color: session.liveRadioSpeaker.color || '#10b981',
        };
        setIncomingSpeaker(spk);
        if (onLiveSpeakerStateChange) {
          onLiveSpeakerStateChange({ ...spk, isSpeaking: true });
        }
      } else if (!session.liveRadioSpeaker.isSpeaking && incomingSpeaker?.id === session.liveRadioSpeaker.id) {
        setIncomingSpeaker(null);
        if (onLiveSpeakerStateChange) {
          onLiveSpeakerStateChange(null);
        }
      }
    }

    // Check latest completed voice dispatch
    if (session.latestVoiceDispatch) {
      playIncomingVoiceDispatch(session.latestVoiceDispatch);
    }
  }, [session, memberId, playIncomingVoiceDispatch, incomingSpeaker?.id, onLiveSpeakerStateChange]);

  // 2. Multi-channel broadcast & cross-tab / cross-device signaling
  useEffect(() => {
    let isMounted = true;
    let unsubFirestoreChannel: (() => void) | null = null;

    // BroadcastChannel for instant 0ms local tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('camgo_ptt_walkie_talkie');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (!isMounted) return;
          const msg = event.data;
          if (msg?.channel !== activeChannel || msg?.senderId === memberId) return;

          if (msg.event === 'ptt_audio_start') {
            const spk = {
              id: msg.senderId,
              name: msg.senderName,
              color: msg.senderColor || '#10b981',
            };
            setIncomingSpeaker(spk);
            playRadioSound('squelch');
            if (onLiveSpeakerStateChange) {
              onLiveSpeakerStateChange({ ...spk, isSpeaking: true });
            }
          } else if (msg.event === 'ptt_audio_end') {
            setIncomingSpeaker(null);
            if (onLiveSpeakerStateChange) {
              onLiveSpeakerStateChange(null);
            }
          } else if (msg.event === 'ptt_voice_dispatch' && msg.payload) {
            playIncomingVoiceDispatch(msg.payload);
          }
        };
      } catch {
        // ignore
      }
    }

    // Public / Non-party channel Firestore listener
    const isPublicChannel = !activeChannel.startsWith('party_');
    if (db && isPublicChannel) {
      try {
        const channelDocRef = doc(db, 'walkie_talkie_live', activeChannel);
        unsubFirestoreChannel = onSnapshot(channelDocRef, (snap) => {
          if (!isMounted || !snap.exists()) return;
          const data = snap.data();
          if (data?.latestVoiceDispatch) {
            playIncomingVoiceDispatch(data.latestVoiceDispatch);
          }
          if (data?.liveRadioSpeaker && data.liveRadioSpeaker.id !== memberId) {
            const isRecent = Date.now() - (data.liveRadioSpeaker.timestamp || 0) < 15000;
            if (data.liveRadioSpeaker.isSpeaking && isRecent) {
              const spk = {
                id: data.liveRadioSpeaker.id,
                name: data.liveRadioSpeaker.name,
                color: data.liveRadioSpeaker.color || '#10b981',
              };
              setIncomingSpeaker(spk);
              if (onLiveSpeakerStateChange) {
                onLiveSpeakerStateChange({ ...spk, isSpeaking: true });
              }
            } else if (!data.liveRadioSpeaker.isSpeaking) {
              setIncomingSpeaker(null);
              if (onLiveSpeakerStateChange) {
                onLiveSpeakerStateChange(null);
              }
            }
          }
        });
      } catch {
        // ignore
      }
    }

    return () => {
      isMounted = false;
      if (unsubFirestoreChannel) {
        unsubFirestoreChannel();
      }
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch {}
        broadcastChannelRef.current = null;
      }
    };
  }, [activeChannel, memberId, playIncomingVoiceDispatch, playRadioSound, onLiveSpeakerStateChange]);

  // Sync active party companions as tuned-in peers
  useEffect(() => {
    if (session?.members) {
      const next = new Map<string, PeerInfo>();
      Object.values(session.members).forEach((m) => {
        if (m && m.id && m.id !== memberId) {
          next.set(m.id, {
            id: m.id,
            name: m.name,
            color: m.avatarColor,
            lastSeen: Date.now(),
          });
        }
      });
      setActivePeers(next);
      setConnectionStatus('connected');
    }
  }, [session?.members, memberId]);

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
        // Live microphone frequency waveform
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barCount = 28;
        const barWidth = width / barCount - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * height * 0.9);
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

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
        // Dynamic pulsating incoming radio frequency waveform
        const barCount = 28;
        const barWidth = width / barCount - 2;
        const now = Date.now() / 150;

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(now + i * 0.4) * 0.5 + 0.5;
          const barHeight = Math.max(4, wave * height * 0.78);
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          ctx.fillStyle = incomingSpeaker.color || '#38bdf8';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else {
        // Standby baseline
        ctx.fillStyle = '#292524';
        const barCount = 24;
        const barWidth = width / barCount - 2;
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

  // Start Transmission
  const startTransmission = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (isTransmitting) return;

    audioService
      .unlockAudio()
      .then(() => setSpeakerUnlocked(true))
      .catch(() => {});

    setPermissionError(null);
    transmitStartTimeRef.current = Date.now();
    recordedBlobsRef.current = [];

    // Tactile haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {}
    }

    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) throw new Error('AudioContext unavailable');
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Request clean audio stream with noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      mediaStreamRef.current = stream;

      // Connect to analyser for live visualizer
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Play start key chirp
      playRadioSound('start');
      setIsTransmitting(true);

      showToast(
        language === 'bm' ? '🔴 Anda Sedang Bersiaran (PTT)...' : '🔴 You Are Transmitting (PTT)...',
        'start'
      );

      // Notify party companions that you are speaking
      if (session?.code) {
        beaconService.updateRadioSpeakingState(session.code, {
          id: memberId,
          name: memberName || 'Explorer',
          color: avatarColor,
          isSpeaking: true,
        });
      } else if (db) {
        setDoc(doc(db, 'walkie_talkie_live', activeChannel), {
          liveRadioSpeaker: {
            id: memberId,
            name: memberName || 'Explorer',
            color: avatarColor,
            isSpeaking: true,
            timestamp: Date.now(),
          },
        }, { merge: true }).catch(() => {});
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          event: 'ptt_audio_start',
          channel: activeChannel,
          senderId: memberId,
          senderName: memberName || 'Explorer',
          senderColor: avatarColor,
        });
      }

      // Determine supported codec
      let chosenMime = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          chosenMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          chosenMime = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          chosenMime = 'audio/mp4';
        } else {
          chosenMime = '';
        }
      }

      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedBlobsRef.current.push(event.data);
        }
      };

      recorder.start(100);
    } catch (err: any) {
      console.error('[WalkieTalkieLive] Transmission start failed:', err);
      setIsTransmitting(false);

      let msg = language === 'bm'
        ? 'Ralat mikrofon. Sila pastikan mikrofon tersedia.'
        : 'Microphone unavailable or in use.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('denied')) {
        msg = language === 'bm'
          ? 'AKSES DITOLAK: Sila klik ikon kunci di bar URL dan benarkan Mikrofon.'
          : 'ACCESS DENIED: Please click the lock icon in your URL bar and allow Microphone.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = language === 'bm'
          ? 'TIADA MIKROFON: Peranti audio tidak dijumpai.'
          : 'NO MICROPHONE: Audio input device not found on this device.';
      }
      setPermissionError(msg);
    }
  };

  // Stop Transmission & Broadcast Complete Audio File
  const stopTransmission = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!isTransmitting) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }

    setIsTransmitting(false);
    playRadioSound('end');

    const durationMs = Date.now() - transmitStartTimeRef.current;
    const durationSec = Math.max(1, Math.round(durationMs / 1000));

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        try {
          const finalMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const fullAudioBlob = new Blob(recordedBlobsRef.current, { type: finalMime });
          recordedBlobsRef.current = [];

          // Release mic stream
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }

          // Ignore empty or micro-taps (< 350ms)
          if (durationMs < 350 || fullAudioBlob.size < 400) {
            showToast(
              language === 'bm' ? '⚠️ Tekan & tahan untuk bercakap' : '⚠️ Hold down to speak',
              'end'
            );
            return;
          }

          // Convert to Base64 and broadcast
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            const dispatchId = 'disp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

            const voicePayload: BeaconVoiceDispatch = {
              id: dispatchId,
              senderId: memberId,
              senderName: memberName || 'Explorer',
              senderColor: avatarColor,
              audioData: base64Audio,
              durationSec,
              timestamp: Date.now(),
            };

            // 1. Broadcast to party session in Firestore
            if (session?.code) {
              beaconService.sendPartyVoiceDispatch(session.code, voicePayload);
            } else if (db) {
              setDoc(doc(db, 'walkie_talkie_live', activeChannel), {
                latestVoiceDispatch: voicePayload,
                liveRadioSpeaker: {
                  id: memberId,
                  name: memberName || 'Explorer',
                  color: avatarColor,
                  isSpeaking: false,
                  timestamp: Date.now(),
                },
              }, { merge: true }).catch(() => {});
            }

            // 2. Broadcast via local BroadcastChannel
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage({
                event: 'ptt_voice_dispatch',
                channel: activeChannel,
                senderId: memberId,
                payload: voicePayload,
              });
            }

            // 3. Add to local transmission log
            setTransmissionLogs((prev) => [
              {
                id: dispatchId,
                speakerId: memberId,
                speakerName: `${memberName || 'Explorer'} (You)`,
                speakerColor: avatarColor,
                channel: activeChannel,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                type: 'outgoing',
                audioData: base64Audio,
                durationSec,
              },
              ...prev.slice(0, 24),
            ]);

            showToast(
              language === 'bm' ? '🟢 Siaran Dihantar (Roger)' : '🟢 Voice Broadcast Sent (Roger)',
              'end'
            );
          };
          reader.readAsDataURL(fullAudioBlob);
        } catch (err) {
          console.error('[WalkieTalkieLive] Error finalizing recording:', err);
        }
      };

      mediaRecorderRef.current.stop();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  // Spacebar push-to-talk keyboard shortcut (desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        startTransmission();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          return;
        }
        e.preventDefault();
        stopTransmission();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTransmitting]);

  // Safety release listener so sliding finger off button stops transmission cleanly
  useEffect(() => {
    if (!isTransmitting) return;
    const handleGlobalRelease = () => {
      stopTransmission();
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, [isTransmitting]);

  // Volume slider update
  const handleVolumeChange = (newVol: number) => {
    setSpeakerVolume(newVol);
    localStorage.setItem('camgo_ptt_volume', String(newVol));
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const currentChannelObj = DEFAULT_CHANNELS.find((c) => c.id === activeChannel);
  const activeChannelTitle = activeChannel === partyChannelId ? partyChannelName : (currentChannelObj?.name || activeChannel);

  if (variant === 'dockedBar') {
    const shortChannelLabel =
      activeChannel === partyChannelId
        ? session?.code
          ? `Party ${session.code}`
          : 'Party Radio'
        : (currentChannelObj?.name.split(':')[0] || activeChannel);

    return (
      <div
        className="w-full bg-stone-950/98 border-t border-emerald-500/35 px-3 py-2 sm:px-5 sm:py-2.5 shrink-0 z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] relative select-none"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Minimal recovery alerts if mic permission or speaker autoplay is blocked */}
        {(permissionError || autoplayBlockedItem) && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-100 text-[11px] flex items-center justify-between gap-2">
            <span className="truncate font-semibold">
              {permissionError
                ? permissionError
                : language === 'bm'
                ? `Suara masuk daripada ${autoplayBlockedItem?.senderName}`
                : `Voice from ${autoplayBlockedItem?.senderName} ready`}
            </span>
            {autoplayBlockedItem ? (
              <button
                type="button"
                onClick={handleTestSpeaker}
                className="px-2.5 py-1 rounded-lg bg-white text-stone-950 font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {language === 'bm' ? 'Mainkan' : 'Play'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPermissionError(null)}
                className="px-2 py-0.5 rounded-lg bg-stone-800 text-stone-200 text-[11px] shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Top/Left Meta Row: Channel Selector + Live Speaker Status + Audio Mute Toggle */}
          <div className="flex items-center justify-between gap-2 sm:flex-1 min-w-0">
            {/* Active Channel / Party Indicator */}
            <div className="relative flex items-center min-w-0 max-w-[140px] sm:max-w-[190px]">
              <Radio
                className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${
                  isTransmitting
                    ? 'text-amber-400'
                    : incomingSpeaker
                    ? 'text-cyan-400'
                    : 'text-emerald-400'
                }`}
              />
              <select
                value={activeChannel}
                onChange={(e) => {
                  setActiveChannel(e.target.value);
                  setActivePeers(new Map());
                }}
                aria-label="Active PTT Radio Channel"
                className="w-full pr-5 py-1 bg-transparent text-xs font-mono font-bold text-stone-100 outline-none cursor-pointer appearance-none truncate"
              >
                <option value={partyChannelId} className="bg-stone-900 text-stone-100">
                  {session?.code ? `Party #${session.code}` : 'Party Channel'}
                </option>
                {DEFAULT_CHANNELS.map((ch) => (
                  <option key={ch.id} value={ch.id} className="bg-stone-900 text-stone-100">
                    {ch.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-0 pointer-events-none" />
            </div>

            {/* Live Speaker Status Badge */}
            <div
              className={`flex-1 min-w-0 flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold truncate ${
                isTransmitting
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  : incomingSpeaker
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                  : 'bg-stone-900 border-white/10 text-stone-300'
              }`}
            >
              {isTransmitting ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {language === 'bm' ? 'LIVE TX · Bersiaran' : 'LIVE TX · Speaking'}
                  </span>
                </>
              ) : incomingSpeaker ? (
                <>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: incomingSpeaker.color || '#22d3ee' }}
                  />
                  <span className="truncate whitespace-nowrap">
                    RX · {incomingSpeaker.name}
                  </span>
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {shortChannelLabel} · {activePeers.size + 1} online
                  </span>
                </>
              )}
            </div>

            {/* Audio Mute Toggle (44x44px minimum touch hitbox) */}
            <button
              type="button"
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  audioService.unlockAudio().then(() => setSpeakerUnlocked(true)).catch(() => {});
                } else {
                  setIsMuted(true);
                }
              }}
              aria-label={isMuted ? 'Unmute Radio Audio' : 'Mute Radio Audio'}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className={`min-w-[44px] min-h-[44px] px-2.5 rounded-xl border flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 ${
                isMuted
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  : 'bg-stone-900 hover:bg-stone-800 border-white/15 text-emerald-300'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Primary Thumb-Zone Press & Hold to Talk (PTT) Button */}
          <button
            type="button"
            onPointerDown={startTransmission}
            onPointerUp={stopTransmission}
            onPointerCancel={stopTransmission}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
            aria-label="Press and hold to talk"
            className={`w-full sm:w-auto sm:min-w-[220px] min-h-[48px] px-5 py-2.5 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2.5 cursor-pointer select-none transition-transform duration-150 active:scale-[0.98] shrink-0 shadow-lg ${
              isTransmitting
                ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-400/40 shadow-amber-500/30'
                : incomingSpeaker
                ? 'bg-cyan-700 hover:bg-cyan-600 text-white border border-cyan-400/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-emerald-950/60'
            }`}
          >
            {isTransmitting ? (
              <Mic className="w-5 h-5 text-stone-950 shrink-0" />
            ) : incomingSpeaker ? (
              <Volume2 className="w-5 h-5 text-cyan-100 shrink-0" />
            ) : (
              <Mic className="w-5 h-5 text-white shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {isTransmitting
                ? language === 'bm'
                  ? 'Sedang Bersiaran — Lepas Hantar'
                  : 'Transmitting — Release to Send'
                : incomingSpeaker
                ? language === 'bm'
                  ? `Menerima: ${incomingSpeaker.name}`
                  : `Receiving: ${incomingSpeaker.name}`
                : language === 'bm'
                ? 'Tekan & Tahan untuk Bercakap'
                : 'Press & Hold to Talk'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col bg-stone-950 text-stone-100 rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl relative ${compactMode ? 'p-2 sm:p-3' : 'p-4 sm:p-6 space-y-4'}`}>
      {/* Background Radiance */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Floating Status Notification Toast */}
      {transmissionToast && (
        <div
          className={`absolute top-2.5 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-md text-[11px] font-bold font-mono flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-none ${
            transmissionToast.type === 'start'
              ? 'bg-amber-950/95 border-amber-400/80 text-amber-200 shadow-amber-950/60'
              : transmissionToast.type === 'receive'
              ? 'bg-cyan-950/95 border-cyan-400/80 text-cyan-200 shadow-cyan-950/60'
              : 'bg-emerald-950/95 border-emerald-400/80 text-emerald-200 shadow-emerald-950/60'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${transmissionToast.type === 'start' ? 'bg-amber-400 animate-ping' : transmissionToast.type === 'receive' ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
          <span>{transmissionToast.message}</span>
        </div>
      )}

      {/* Autoplay Blocked Tap-To-Listen Alert Banner */}
      {autoplayBlockedItem && (
        <div
          onClick={handleTestSpeaker}
          className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-rose-600 border border-white/20 text-white shadow-xl cursor-pointer flex items-center justify-between gap-3 animate-bounce relative z-50"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className="w-5 h-5 shrink-0 animate-pulse text-white" />
            <div className="min-w-0">
              <div className="font-black text-xs uppercase tracking-wide">
                {language === 'bm' ? 'Mesej Suara Masuk Tersekat!' : 'Incoming Voice Transmission!'}
              </div>
              <div className="text-[11px] truncate opacity-90">
                {language === 'bm'
                  ? `Sentuh di sini untuk mendengar suara daripada ${autoplayBlockedItem.senderName}`
                  : `Tap here to listen to message from ${autoplayBlockedItem.senderName}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-white text-stone-900 font-black text-xs uppercase shrink-0 shadow-md"
          >
            {language === 'bm' ? 'Dengar' : 'Play'}
          </button>
        </div>
      )}

      {/* Top Header: Channel, Connection Health & Speaker Test */}
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
              <button
                type="button"
                onClick={() => setShowHowToUse(!showHowToUse)}
                className="p-1 rounded-full text-stone-400 hover:text-emerald-400 hover:bg-stone-800/80 transition-colors cursor-pointer"
                title={language === 'bm' ? 'Cara Menggunakan Radio PTT' : 'How to use PTT Radio'}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            {!compactMode && (
              <p className="text-[11px] text-stone-400">
                Push-To-Talk Party Dispatch • Real-Time Voice Over Web
              </p>
            )}
          </div>
        </div>

        {/* Audio Speaker Test & Status Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestSpeaker}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              speakerUnlocked
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse hover:bg-amber-900/80'
            }`}
            title={language === 'bm' ? 'Uji & Aktifkan Pembesar Suara' : 'Test & Enable Speaker Audio'}
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{speakerUnlocked ? (language === 'bm' ? 'Suara: Sedia' : 'Audio: Ready') : (language === 'bm' ? 'Buka Suara' : 'Unlock Audio')}</span>
          </button>

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

      {/* How To Use Instruction Guide Modal / Dropdown */}
      {showHowToUse && (
        <div className="p-3.5 rounded-2xl bg-stone-900 border border-emerald-500/40 text-stone-200 text-xs space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <span className="font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {language === 'bm' ? 'Panduan Penggunaan Radio PTT' : 'How To Use PTT Radio in Find My Party'}
            </span>
            <button
              type="button"
              onClick={() => setShowHowToUse(false)}
              className="text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
              <div className="font-bold text-amber-300">1. Pastikan Saluran Sama</div>
              <p className="text-stone-400">
                {language === 'bm'
                  ? 'Gunakan saluran Party untuk bercakap dengan rakan kumpulan anda.'
                  : 'Ensure both companions are in the same party code or channel.'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
              <div className="font-bold text-emerald-300">2. Tekan & Tahan Butang PTT</div>
              <p className="text-stone-400">
                {language === 'bm'
                  ? 'Tekan dan TAHAN butang bulat PTT (atau kekunci Spacebar di PC). Cakap selepas bunyi bip.'
                  : 'Hold down the round PTT button (or Spacebar). Speak clearly into your mic.'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
              <div className="font-bold text-cyan-300">3. Lepaskan Untuk Menghantar</div>
              <p className="text-stone-400">
                {language === 'bm'
                  ? 'Lepaskan butang. Suara anda disiarkan serta-merta ke pembesar suara rakan!'
                  : 'Release to transmit. Companions hear your voice immediately through speaker!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Channel Selector & Active Peer Presence Count */}
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
                <span className="uppercase tracking-wider">LIVE TRANSMITTING (MIC OPEN)...</span>
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
            {isTransmitting ? 'TALK NOW' : incomingSpeaker ? 'SPEAKER PLAYING' : 'SPACEBAR / HOLD TO TALK'}
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

        {/* Microphone Permission Error Notice */}
        {permissionError && (
          <div className="p-3.5 rounded-2xl bg-rose-900 border-2 border-rose-500 shadow-lg text-white space-y-2">
            <div className="flex items-start gap-2.5">
              <MicOff className="w-5 h-5 text-rose-200 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold uppercase tracking-wide">
                  {language === 'bm' ? 'Kebenaran Mikrofon Diperlukan' : 'Microphone Permission Needed'}
                </div>
                <p className="text-[11px] text-rose-100">{permissionError}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => startTransmission()}
                className="px-3 py-1 rounded-lg bg-white text-rose-900 font-bold text-xs uppercase cursor-pointer"
              >
                {language === 'bm' ? 'Cuba Lagi' : 'Try Again'}
              </button>
              <button
                type="button"
                onClick={() => setPermissionError(null)}
                className="px-3 py-1 rounded-lg bg-stone-800 text-stone-200 text-xs cursor-pointer"
              >
                {language === 'bm' ? 'Tutup' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Tactile "HOLD TO TALK" Button */}
      <div className={`flex flex-col items-center justify-center relative select-none ${compactMode ? 'py-1 sm:py-2' : 'py-2 sm:py-4'}`}>
        {/* Pulsing Radiance when Transmitting */}
        {isTransmitting && (
          <>
            <div className={`absolute rounded-full border-2 border-amber-500/40 animate-ping pointer-events-none ${compactMode ? 'w-24 h-24' : 'w-36 h-36 sm:w-56 sm:h-56'}`} />
            <div className={`absolute rounded-full border border-emerald-400/30 animate-pulse pointer-events-none ${compactMode ? 'w-32 h-32' : 'w-44 h-44 sm:w-64 sm:h-64'}`} />
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
              ? 'w-24 h-24 sm:w-32 sm:h-32' 
              : 'w-28 h-28 xs:w-36 xs:h-36 sm:w-44 sm:h-44'
          } ${
            isTransmitting
              ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 ring-8 ring-amber-500/30 scale-105 shadow-[0_0_50px_rgba(245,158,11,0.6)]'
              : incomingSpeaker
              ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 ring-8 ring-cyan-500/30 opacity-75 shadow-[0_0_40px_rgba(6,182,212,0.4)]'
              : 'bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 hover:from-stone-700 hover:to-stone-900 border-4 border-stone-700/80 hover:border-emerald-500/60 shadow-[0_0_35px_rgba(0,0,0,0.8)]'
          }`}
          aria-label="Push to Talk Button"
        >
          {/* Inner Metallic Bezel Ring */}
          <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />

          {/* Icon */}
          <div className={`${compactMode ? 'mb-0' : 'mb-0.5 sm:mb-1'} text-white transition-transform group-hover:scale-110`}>
            {isTransmitting ? (
              <Mic className={`${compactMode ? 'w-6 h-6' : 'w-8 h-8 sm:w-12 sm:h-12'} animate-bounce text-stone-950`} />
            ) : incomingSpeaker ? (
              <Volume2 className={`${compactMode ? 'w-6 h-6' : 'w-8 h-8 sm:w-12 sm:h-12'} text-cyan-200 animate-pulse`} />
            ) : (
              <Mic className={`${compactMode ? 'w-6 h-6' : 'w-8 h-8 sm:w-12 sm:h-12'} text-emerald-400 group-hover:text-emerald-300`} />
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
            ? (compactMode ? 'Tahan untuk cakap' : 'Tekan & tahan untuk bercakap (atau Spacebar). Lepaskan untuk hantar.')
            : (compactMode ? 'Hold to talk' : 'Press & hold to speak (or Spacebar). Release to send.')}
        </p>
      </div>

      {/* Speaker Volume Slider & Sound Effects Toggle */}
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

        {/* Audio Sound Effects Toggle */}
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

      {/* Recent Transmissions Log with Instant Replay */}
      {transmissionLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>{language === 'bm' ? 'Sejarah Siaran Suara (Boleh Main Semula):' : 'Recent Transmissions (Tap to Replay):'}</span>
            <span>{transmissionLogs.length} logged</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {transmissionLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-stone-900/80 border border-white/5 flex items-center justify-between text-xs hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: log.speakerColor }}
                  />
                  <span className="font-bold text-stone-200 truncate">{log.speakerName}</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {log.type === 'outgoing' ? '• You' : `• (${log.durationSec || 1}s)`}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-stone-400">{log.timestamp}</span>
                  {log.audioData && (
                    <button
                      type="button"
                      onClick={() => handleReplayLogItem(log)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all ${
                        playingLogId === log.id
                          ? 'bg-emerald-500 text-stone-950 font-black animate-pulse'
                          : 'bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/30'
                      }`}
                      title="Replay Voice Transmission"
                    >
                      {playingLogId === log.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{playingLogId === log.id ? 'Playing' : 'Replay'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
