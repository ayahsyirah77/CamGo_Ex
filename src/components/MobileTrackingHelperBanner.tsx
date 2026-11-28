import React, { useState } from 'react';
import { ShieldAlert, Sun, Moon, X, RefreshCw, Signal, AlertTriangle } from 'lucide-react';
import { GpsTrackingStatus } from '../hooks/usePersistentGeolocation';
import { Language } from '../types';

interface MobileTrackingHelperBannerProps {
  language: Language;
  gpsStatus: GpsTrackingStatus;
  errorCode: number | null;
  errorMessage: string | null;
  lastFixAt: number | null;
  wakeLockSupported: boolean;
  wakeLockActive: boolean;
  keepAwakeEnabled: boolean;
  onToggleKeepAwake: (next: boolean) => void;
  onRetryGps: () => void;
  variant?: 'dark' | 'light';
}

export const MobileTrackingHelperBanner: React.FC<MobileTrackingHelperBannerProps> = ({
  language,
  gpsStatus,
  errorCode,
  errorMessage,
  lastFixAt,
  wakeLockSupported,
  wakeLockActive,
  keepAwakeEnabled,
  onToggleKeepAwake,
  onRetryGps,
  variant = 'dark',
}) => {
  const [dismissedTip, setDismissedTip] = useState(false);
  const isBm = language === 'bm';

  const isError =
    gpsStatus === 'permission_denied' ||
    gpsStatus === 'unavailable' ||
    gpsStatus === 'timeout' ||
    gpsStatus === 'unsupported';

  const getStatusMeta = () => {
    if (gpsStatus === 'permission_denied' || errorCode === 1) {
      return {
        badge: 'PERMISSION_DENIED',
        text: isBm
          ? 'Akses lokasi disekat (Kod 1). Benarkan GPS sentiasa aktif dalam tetapan pelayar.'
          : 'Location blocked (Code 1). Allow GPS permission in browser settings.',
        tone: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    }
    if (gpsStatus === 'unavailable' || errorCode === 2) {
      return {
        badge: 'POSITION_UNAVAILABLE',
        text: isBm
          ? 'Isyarat GPS tiada buat sementara (Kod 2). Cuba bergerak ke ruang terbuka.'
          : 'GPS signal unavailable (Code 2). Move toward clearer sky or wait for fix.',
        tone: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    if (gpsStatus === 'timeout' || errorCode === 3) {
      return {
        badge: 'GPS_TIMEOUT',
        text: isBm
          ? 'Masa tamat GPS (Kod 3). Pemulihan automatik setiap 12s sedang berjalan.'
          : 'GPS fix timed out (Code 3). Heartbeat auto-recovery running every 12s.',
        tone: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    if (gpsStatus === 'stalled_recovering') {
      return {
        badge: isBm ? 'MEMULIH GPS' : 'RECOVERING GPS',
        text: isBm
          ? 'Isyarat terhenti seketika — memuat semula koordinat terkini.'
          : 'GPS heartbeat stalled — triggering fresh coordinate lock.',
        tone: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    if (gpsStatus === 'acquiring') {
      return {
        badge: isBm ? 'MENCARI GPS' : 'ACQUIRING GPS',
        text: isBm ? 'Mengunci satelit ketepatan tinggi...' : 'Locking high-accuracy GPS satellite...',
        tone: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      };
    }
    return {
      badge: isBm ? 'GPS AKTIF' : 'LIVE GPS',
      text: lastFixAt
        ? `${isBm ? 'Dikemas kini' : 'Last lock'}: ${new Date(lastFixAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}`
        : isBm
          ? 'Penjejakan berterusan aktif'
          : 'Continuous watch active',
      tone: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  };

  const meta = getStatusMeta();
  const containerClass =
    variant === 'light'
      ? 'bg-stone-100 border border-stone-200 text-stone-800'
      : 'bg-stone-900/90 border border-stone-700/80 text-stone-100';

  return (
    <div className={`rounded-xl px-3 py-2.5 text-xs space-y-2 ${containerClass}`}>
      {/* Top Status + Wake Lock Toggle Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isError ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <Signal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wide shrink-0 ${meta.tone}`}>
            {meta.badge}
          </span>
          <span className="text-[11px] opacity-85 truncate">
            {isError && errorMessage ? meta.text : meta.text}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isError && (
            <button
              type="button"
              onClick={onRetryGps}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors min-h-[32px]"
            >
              <RefreshCw className="w-3 h-3" />
              {isBm ? 'Cuba Lagi' : 'Retry'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleKeepAwake(!keepAwakeEnabled)}
            title={
              isBm
                ? 'Tukar kunci skrin terjaga berbanding mod jimat bateri'
                : 'Toggle Keep Screen Awake vs battery-saver sleep mode'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors min-h-[32px] ${
              keepAwakeEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-800 border-stone-600 text-stone-300'
            }`}
          >
            {keepAwakeEnabled ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>
              {keepAwakeEnabled
                ? isBm
                  ? wakeLockSupported && wakeLockActive
                    ? 'Skrin Terjaga: Aktif'
                    : 'Skrin Terjaga: Hidup'
                  : wakeLockSupported && wakeLockActive
                    ? 'Keep Awake: On'
                    : 'Keep Awake: Auto'
                : isBm
                  ? 'Jimat Bateri'
                  : 'Battery Saver'}
            </span>
          </button>
        </div>
      </div>

      {/* Dismissible Mobile OS Background GPS Guidance */}
      {!dismissedTip && (
        <div className="flex items-start justify-between gap-2 pt-1.5 border-t border-stone-700/60 text-[11px] leading-snug text-stone-300">
          <div className="flex items-start gap-1.5 min-w-0">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="min-w-0">
              {isBm ? (
                <>
                  <strong className="text-white">Tip GPS Latar Belakang:</strong> Tetapkan kebenaran Lokasi pelayar kepada{' '}
                  <strong className="text-emerald-300">"Sentiasa" / "All the time"</strong> dan penggunaan Bateri kepada{' '}
                  <strong className="text-emerald-300">"Tanpa Had" / "Unrestricted"</strong> supaya GPS tidak terhenti apabila skrin dikunci.
                </>
              ) : (
                <>
                  <strong className="text-white">Background GPS Tip:</strong> Set browser Location permission to{' '}
                  <strong className="text-emerald-300">"All the time" / "Always"</strong> and Battery usage to{' '}
                  <strong className="text-emerald-300">"Unrestricted"</strong> so tracking keeps running when your phone screen locks.
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedTip(true)}
            aria-label={isBm ? 'Tutup tip' : 'Dismiss tip'}
            className="p-1 text-stone-400 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
