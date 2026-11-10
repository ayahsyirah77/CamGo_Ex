/**
 * WalkieTalkie Component
 * Real-time voice dispatch & Push-To-Talk radio for Cameron Highlands visitors.
 * Styled in a dark theme (slate-900 / slate-950 with emerald accents).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertCircle,
  Clock,
  MapPin,
  Users,
  Sparkles,
  Signal,
  CheckCircle2,
  RefreshCw,
  Send,
  User,
  X,
} from 'lucide-react';
import {
  walkieTalkieService,
  WalkieTalkieMessage,
} from '../services/walkieTalkieService';

export interface WalkieTalkieProps {
  channel?: string;
  senderName?: string;
  senderId?: string;
  location?: string;
  onClose?: () => void;
  className?: string;
}

const CHANNELS = [
  { id: 'highland-broadcast', name: 'CH-01: Highland Broadcast', desc: 'Main Visitor Radio' },
  { id: 'traffic-roads', name: 'CH-02: Traffic & Mountain Passes', desc: 'FT59 & FT185 Alerts' },
  { id: 'trails-recon', name: 'CH-03: Trails & Mossy Peak', desc: 'Hiking & Forest Recon' },
  { id: 'food-steamboats', name: 'CH-04: Food & Gathering', desc: 'Night Markets & Cafes' },
];

export const WalkieTalkie: React.FC<WalkieTalkieProps> = ({
  channel: initialChannel = 'highland-broadcast',
  senderName: initialSenderName,
  senderId: initialSenderId,
  location: initialLocation = 'Cameron Highlands',
  onClose,
  className = '',
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>(initialChannel);
  const [messages, setMessages] = useState<WalkieTalkieMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // User Profile
  const [senderName, setSenderName] = useState(() => {
    return initialSenderName || walkieTalkieService.getSenderInfo().name;
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(senderName);

  // Audio Playback State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ [key: string]: number }>({});
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    const unsubscribe = walkieTalkieService.subscribeToMessages((newMessages) => {
      setMessages(newMessages);
    }, selectedChannel);

    return () => {
      unsubscribe();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, [selectedChannel]);

  // Keep senderName synced with service
  const handleSaveName = () => {
    const clean = tempName.trim() || 'Highland Explorer';
    setSenderName(clean);
    walkieTalkieService.setSenderName(clean);
    setIsEditingName(false);
  };

  // Start Push-To-Talk
  const handleStartRecording = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isRecording || isSending) return;

    setPermissionError(null);
    try {
      await walkieTalkieService.startRecording((duration) => {
        setRecordingDurationMs(duration);
      });
      setIsRecording(true);
    } catch (err: any) {
      console.error('[WalkieTalkie] startRecording failed:', err);
      setIsRecording(false);
      setPermissionError(
        err?.message || 'Microphone access denied. Please allow microphone permissions in your browser.'
      );
    }
  };

  // Stop & Auto-Send Voice Message
  const handleStopRecording = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!isRecording) return;

    setIsRecording(false);
    setIsSending(true);

    try {
      const { blob, durationMs } = await walkieTalkieService.stopRecording();
      setRecordingDurationMs(0);

      // Only send if audio is at least 0.4s to prevent accidental micro-clicks
      if (durationMs >= 400 && blob.size > 500) {
        await walkieTalkieService.sendVoiceMessage(blob, durationMs, {
          channel: selectedChannel,
          senderName: senderName || 'Highland Explorer',
          senderId: initialSenderId,
          location: initialLocation,
        });
      }
    } catch (err: any) {
      console.error('[WalkieTalkie] Sending voice message failed:', err);
      setPermissionError('Failed to upload audio message: ' + (err?.message || 'Network error'));
    } finally {
      setIsSending(false);
      setRecordingDurationMs(0);
    }
  };

  // Cancel recording on gesture cancel
  const handleCancelRecording = () => {
    if (isRecording) {
      walkieTalkieService.cancelRecording();
      setIsRecording(false);
      setRecordingDurationMs(0);
    }
  };

  // Custom Audio Player Handler
  const togglePlayAudio = (msg: WalkieTalkieMessage) => {
    if (playingId === msg.id && activeAudioRef.current) {
      if (!activeAudioRef.current.paused) {
        activeAudioRef.current.pause();
        setPlayingId(null);
        return;
      }
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    try {
      const audio = new Audio(msg.audioUrl);
      activeAudioRef.current = audio;
      setPlayingId(msg.id);

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          const pct = (audio.currentTime / audio.duration) * 100;
          setPlaybackProgress((prev) => ({ ...prev, [msg.id]: pct }));
        }
      };

      audio.onended = () => {
        setPlayingId(null);
        setPlaybackProgress((prev) => ({ ...prev, [msg.id]: 0 }));
        activeAudioRef.current = null;
      };

      audio.onerror = () => {
        console.warn('[WalkieTalkie] Playback error on audio message:', msg.id);
        setPlayingId(null);
        activeAudioRef.current = null;
      };

      audio.play().catch((err) => {
        console.warn('[WalkieTalkie] Play promise rejected:', err);
        setPlayingId(null);
      });
    } catch (err) {
      console.warn('[WalkieTalkie] Audio element error:', err);
      setPlayingId(null);
    }
  };

  // Helper formatting for time
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatElapsedTime = (ms: number) => {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m}:${s < 10 ? '0' : ''}${s}.${tenths}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 15) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`rounded-3xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl flex flex-col overflow-hidden relative ${className}`}
    >
      {/* Background Ambience Glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-white text-base tracking-tight">
                Walkie-Talkie Radio
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Highland Instant Voice Dispatch • Real-Time PTT
            </p>
          </div>
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

      {/* Channel Switcher & Sender Info */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800/60 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Channel selector */}
          <div className="flex-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Frequency / Channel
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-bold text-xs outline-none focus:border-emerald-500 transition-colors cursor-pointer shadow-inner"
            >
              {CHANNELS.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  📻 {ch.name} — {ch.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Caller Identity */}
          <div className="sm:w-60">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Callsign / Name
            </label>
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your Name"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-500 text-white text-xs font-bold outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setTempName(senderName);
                  setIsEditingName(true);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium flex items-center justify-between hover:border-slate-700 cursor-pointer transition-colors"
                title="Click to edit name"
              >
                <span className="truncate font-bold text-white">🎙️ {senderName}</span>
                <span className="text-[10px] text-emerald-400 hover:underline">Edit</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permission Error Banner */}
      {permissionError && (
        <div className="m-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-100 mb-0.5">Microphone Issue</div>
            <p className="text-[11px] leading-relaxed text-rose-200/90">{permissionError}</p>
          </div>
          <button
            onClick={() => setPermissionError(null)}
            className="text-xs text-rose-400 hover:text-white px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Hold to Talk Section */}
      <div className="p-6 sm:p-8 flex flex-col items-center justify-center relative select-none bg-gradient-to-b from-transparent via-slate-900/30 to-slate-950">
        {/* Pulsing Aura Rings while recording */}
        {isRecording && (
          <>
            <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-emerald-500/30 animate-ping pointer-events-none" />
            <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-emerald-400/20 animate-pulse pointer-events-none" />
          </>
        )}

        {/* Central Tactical PTT Push-To-Talk Button */}
        <button
          type="button"
          onMouseDown={handleStartRecording}
          onMouseUp={handleStopRecording}
          onMouseLeave={handleStopRecording}
          onTouchStart={handleStartRecording}
          onTouchEnd={handleStopRecording}
          onTouchCancel={handleCancelRecording}
          disabled={isSending}
          style={{ touchAction: 'none' }}
          className={`relative group rounded-full transition-all duration-150 flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 shadow-2xl w-32 h-32 sm:w-40 sm:h-40 ${
            isRecording
              ? 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 ring-8 ring-emerald-500/40 scale-105 shadow-[0_0_50px_rgba(16,185,129,0.7)]'
              : isSending
              ? 'bg-slate-800 opacity-60 cursor-wait'
              : 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 hover:from-slate-700 hover:to-slate-900 border-4 border-slate-700 hover:border-emerald-500/60 shadow-[0_0_30px_rgba(0,0,0,0.8)]'
          }`}
          aria-label="Hold to Talk"
        >
          {/* Inner Bezel Ring */}
          <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />

          {/* Center Mic Icon */}
          <div className="text-white transition-transform group-hover:scale-110 mb-1">
            <Mic
              className={`w-10 h-10 sm:w-12 sm:h-12 ${
                isRecording
                  ? 'animate-bounce text-slate-950'
                  : 'text-emerald-400 group-hover:text-emerald-300'
              }`}
            />
          </div>

          {/* Button Text & Live Timer */}
          <span
            className={`font-black tracking-wider uppercase text-center px-2 leading-tight ${
              isRecording
                ? 'text-slate-950 text-xs sm:text-sm font-mono'
                : isSending
                ? 'text-slate-400 text-xs'
                : 'text-slate-200 group-hover:text-emerald-300 text-xs sm:text-sm'
            }`}
          >
            {isRecording
              ? formatElapsedTime(recordingDurationMs)
              : isSending
              ? 'SENDING...'
              : 'HOLD TO TALK'}
          </span>
        </button>

        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-300 font-medium">
            {isRecording ? (
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Release button to broadcast voice note
              </span>
            ) : isSending ? (
              <span className="text-slate-400">Uploading audio to cloud frequency...</span>
            ) : (
              <span className="text-slate-400">
                Press &amp; hold to talk. Release to broadcast to Cameron Highlands.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Live Dispatches Feed Header */}
      <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">Recent Voice Dispatches</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {messages.length} message{messages.length === 1 ? '' : 's'} in channel
        </span>
      </div>

      {/* Live Dispatches Message List */}
      <div className="flex-1 max-h-72 overflow-y-auto p-4 space-y-2.5 bg-slate-950/80 divide-y divide-slate-800/40">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <Radio className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
            <p className="text-xs">No audio dispatches in this channel yet.</p>
            <p className="text-[11px] text-slate-600">
              Be the first! Hold down the button above to broadcast your voice.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isPlaying = playingId === msg.id;
            const progress = playbackProgress[msg.id] || 0;

            return (
              <div
                key={msg.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group"
              >
                {/* Play Button & Waves */}
                <button
                  onClick={() => togglePlayAudio(msg)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
                    isPlaying
                      ? 'bg-emerald-500 text-slate-950 scale-105'
                      : 'bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-slate-700'
                  }`}
                  title={isPlaying ? 'Pause voice message' : 'Play voice message'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Dispatch Details & Progress Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 truncate">
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formatTimeAgo(msg.createdAt)}
                    </span>
                  </div>

                  {/* Audio scrubber/progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-100 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Metadata: Location & Duration */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1 text-slate-400 truncate">
                      <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{msg.location || 'Cameron Highlands'}</span>
                    </span>
                    <span className="font-mono text-emerald-400/90 font-bold shrink-0">
                      {formatSeconds(msg.duration)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Signal className="w-3 h-3 text-emerald-400" />
          <span>CamGo Frequency Network • Open to all visitors</span>
        </span>
        <span className="font-mono text-emerald-400 font-bold">446.0 MHz (Sim)</span>
      </div>
    </div>
  );
};
