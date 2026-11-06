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
  PhoneCall,
  MapPin,
  Volume2,
  VolumeX,
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
  onOpenChat?: () => void;
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
  language = 'en',
  onOpenChat,
}) => {
  return (
    <>
      {/* 1. CRITICAL SOS EMERGENCY MODAL OVERLAY */}
      <AnimatePresence>
        {activeSos && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-red-950/85 backdrop-blur-md animate-pulse">
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
            className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white shadow-2xl border-b border-white/20 p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-top duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/25 animate-pulse">
                <CloudRain className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <span className="font-extrabold uppercase tracking-wide mr-2 bg-black/40 px-2 py-0.5 rounded text-[11px]">
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
                className="px-3 py-1 bg-black/30 hover:bg-black/50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'bm' ? 'Faham' : 'Got It'}
              </button>
              <button
                onClick={() => setActiveWeatherBanner(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
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
            onClick={() => {
              setActiveChatPreview(null);
              onOpenChat?.();
            }}
            className="fixed bottom-20 right-4 z-[99999] max-w-sm bg-stone-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-4 shadow-2xl text-stone-100 cursor-pointer hover:border-emerald-400 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>{language === 'bm' ? 'Mesej Sembang Baharu (Klik untuk buka)' : 'New Lounge Chat (Click to open)'}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChatPreview(null);
                }}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs font-semibold text-stone-200">
              {activeChatPreview.payload.sender || activeChatPreview.payload.senderName || 'Highland Visitor'}
            </div>
            <p className="text-xs text-stone-400 mt-1 line-clamp-2">
              {activeChatPreview.payload.message || activeChatPreview.payload.text || 'Sent a new message in Chat Lounge.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. TOAST CONTAINER FOR JOBS, CLASSIFIEDS, SERVICES (BOTTOM LEFT) */}
      <div className="fixed bottom-6 left-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.95 }}
              className="pointer-events-auto bg-stone-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl text-stone-100 flex items-start gap-3 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
              <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 mt-0.5 shrink-0">
                {toast.event === 'job_posted' ? (
                  <Briefcase className="w-4 h-4" />
                ) : toast.event === 'classified_item' ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : toast.event === 'weather_alert' ? (
                  <CloudRain className="w-4 h-4 text-amber-400" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    {toast.event.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="text-stone-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs font-bold text-stone-100 mt-0.5 truncate">
                  {toast.payload.title || 'New Update Available'}
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">
                  {toast.payload.message || 'Check out the latest posting on CamGo directory grid.'}
                </p>
                {toast.payload.sender && (
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    By {toast.payload.sender}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};
