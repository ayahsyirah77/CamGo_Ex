import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  CloudRain,
  MessageSquare,
  Briefcase,
  ShoppingBag,
  Wrench,
  X,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { NotificationEvent } from '../hooks/useMultiChannelNotifications';

interface NotificationCenterProps {
  activeSos: NotificationEvent | null;
  setActiveSos: (e: NotificationEvent | null) => void;
  activeWeatherBanner: NotificationEvent | null;
  setActiveWeatherBanner: (e: NotificationEvent | null) => void;
  activeChatPreview: NotificationEvent | null;
  setActiveChatPreview: (e: NotificationEvent | null) => void;
  toasts: NotificationEvent[];
  setToasts: React.Dispatch<React.SetStateAction<NotificationEvent[]>>;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isConnected: boolean;
  simulateEvent: (event: string, priority: any, payload: any) => void;
  language?: 'en' | 'bm';
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
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
  language = 'en',
}) => {
  return (
    <>
      {/* 1. CRITICAL SOS EMERGENCY MODAL OVERLAY */}
      <AnimatePresence>
        {activeSos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-pulse">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-stone-950 border-4 border-red-600 rounded-3xl max-w-lg w-full p-6 shadow-2xl shadow-red-900/50 text-stone-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-600 animate-pulse" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/50 text-red-500 animate-bounce">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-red-500 uppercase tracking-widest">
                      {language === 'bm' ? 'KECEMASAN KRITIKAL SOS' : 'CRITICAL SOS EMERGENCY'}
                    </div>
                    <h3 className="text-xl font-heading font-extrabold text-white">
                      {activeSos.payload.title || 'Emergency Assistance Required'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSos(null)}
                  className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 bg-stone-900/90 rounded-2xl p-4 border border-red-500/30 text-sm">
                <p className="text-stone-300">
                  {activeSos.payload.message || 'An SOS emergency beacon has been triggered along Federal Route 59 / highland sector.'}
                </p>

                {activeSos.payload.sender && (
                  <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-white/5">
                    <span>{language === 'bm' ? 'Pengirim:' : 'Sender:'}</span>
                    <span className="font-bold text-stone-200">{activeSos.payload.sender}</span>
                  </div>
                )}

                {activeSos.payload.location && (
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>{language === 'bm' ? 'Lokasi GPS:' : 'GPS Location:'}</span>
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {activeSos.payload.location}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <a
                  href={`tel:${activeSos.payload.phone || '999'}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-950"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Hubungi PDRM/999' : 'Call Dispatch 999'}</span>
                </a>
                <button
                  onClick={() => setActiveSos(null)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 transition-all"
                >
                  <span>{language === 'bm' ? 'Tutup Amaran' : 'Dismiss Alert'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. HIGH-PRIORITY WEATHER STICKY BANNER */}
      <AnimatePresence>
        {activeWeatherBanner && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white shadow-lg border-b border-white/20 p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/20 animate-pulse">
                <CloudRain className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <span className="font-extrabold uppercase tracking-wide mr-2 bg-black/30 px-2 py-0.5 rounded text-[11px]">
                  {language === 'bm' ? 'AMARAN CUACA' : 'WEATHER ALERT'}
                </span>
                <span className="font-medium">
                  {activeWeatherBanner.payload.title || activeWeatherBanner.payload.message || 'Heavy rain & mountain mist warning active on FT 59.'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveWeatherBanner(null)}
                className="px-3 py-1 bg-black/30 hover:bg-black/50 rounded-lg text-xs font-bold transition-colors"
              >
                {language === 'bm' ? 'Faham' : 'Got It'}
              </button>
              <button
                onClick={() => setActiveWeatherBanner(null)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. FLOATING CHAT PREVIEW (BOTTOM RIGHT) */}
      <AnimatePresence>
        {activeChatPreview && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-20 right-4 z-40 max-w-sm bg-stone-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl text-stone-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>{language === 'bm' ? 'Mesej Sembang Baharu' : 'New Lounge Chat'}</span>
              </div>
              <button
                onClick={() => setActiveChatPreview(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs font-semibold text-stone-200">
              {activeChatPreview.payload.sender || 'Highland Visitor'}
            </div>
            <p className="text-xs text-stone-400 mt-1 line-clamp-2">
              {activeChatPreview.payload.message || 'Sent a new message in Chat Lounge.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. TOAST CONTAINER FOR JOBS, CLASSIFIEDS, SERVICES (TOP RIGHT / BOTTOM LEFT) */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.95 }}
              className="pointer-events-auto bg-stone-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl text-stone-100 flex items-start gap-3 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
              <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 mt-0.5">
                {toast.event === 'job_posted' ? (
                  <Briefcase className="w-4 h-4" />
                ) : toast.event === 'classified_item' ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    {toast.event.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="text-stone-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs font-bold text-stone-100 mt-0.5">
                  {toast.payload.title || 'New Update Available'}
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">
                  {toast.payload.message || 'Check out the latest posting on CamGo directory grid.'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 5. FLOATING CONTROLS / SIMULATION DOCK FOR REVIEWERS */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-stone-900/90 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-xl text-stone-300 text-xs">
        <div className="flex items-center gap-1.5 px-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11px] font-medium hidden sm:inline">
            {isConnected ? 'WS Live' : 'Connecting'}
          </span>
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-xl transition-colors ${
            isMuted ? 'bg-red-600/20 text-red-400' : 'bg-white/5 hover:bg-white/10 text-stone-200'
          }`}
          title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => simulateEvent('sos_alert', 'critical', { title: 'Emergency SOS at Mossy Forest', sender: 'Ahmad Zakaria', location: '4.5123, 101.3912', phone: '0123456789' })}
            className="px-2.5 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 font-bold transition-all text-[11px]"
            title="Simulate SOS Emergency"
          >
            SOS
          </button>
          <button
            onClick={() => simulateEvent('weather_alert', 'high', { title: 'Heavy rain & mountain mist warning on FT 59', message: 'Drive with caution: Potential road slippage near Ringlet.' })}
            className="px-2.5 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold transition-all text-[11px]"
            title="Simulate Weather Alert"
          >
            Weather
          </button>
          <button
            onClick={() => simulateEvent('chat_message', 'normal', { sender: 'Cikgu Razak', message: 'Traffic along Tapah - Ringlet is smooth and misty. Drive safely!' })}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold transition-all text-[11px]"
            title="Simulate Chat Message"
          >
            Chat
          </button>
          <button
            onClick={() => simulateEvent('job_posted', 'low', { title: 'Chef Wanted at Brinchang Steamboat', message: 'Full-time highland hospitality position open now.' })}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold transition-all text-[11px]"
            title="Simulate Job Post"
          >
            Job
          </button>
        </div>
      </div>
    </>
  );
};
