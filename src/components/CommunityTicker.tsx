/**
 * Community Ticker Marquee Component (CommunityTicker.tsx)
 * Fetches approved peer hazard reports & announcements in real-time from Firestore ('camgo_hazards'),
 * rendering a sleek continuous scrolling ticker banner matching CamGo's dark theme.
 * Positioned in mobile view strictly above the sticky bottom footer (bottom-16 z-40).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Megaphone, PlusCircle, MapPin, Sparkles, Newspaper } from 'lucide-react';
import { Language, CamgoHazard } from '../types';
import { camgoHazardsService } from '../services/camgoHazardsService';

const TICKER_TTL_MS = 24 * 60 * 60 * 1000;

interface CommunityTickerProps {
  language: Language;
  onOpenReportModal: () => void;
  onSelectHazard?: (hazard: CamgoHazard) => void;
}

function isTickerAlertFresh(hazard: CamgoHazard | null | undefined, nowMs: number): boolean {
  if (!hazard) return false;
  if (hazard.status === 'cleared' || hazard.active === false) return false;

  if (hazard.expiresAt) {
    const expMs = new Date(hazard.expiresAt).getTime();
    if (Number.isFinite(expMs) && expMs <= nowMs) return false;
  }

  const refTimestamp = hazard.updatedAt || hazard.timestamp;
  if (!refTimestamp) return false;
  const alertMs = new Date(refTimestamp).getTime();
  if (!Number.isFinite(alertMs)) return false;

  return nowMs - alertMs < TICKER_TTL_MS;
}

export const CommunityTicker: React.FC<CommunityTickerProps> = ({
  language,
  onOpenReportModal,
  onSelectHazard,
}) => {
  const [hazards, setHazards] = useState<CamgoHazard[]>(() =>
    camgoHazardsService.getCachedActiveHazards()
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const unsubscribe = camgoHazardsService.subscribeActiveHazards((updated) => {
      if (Array.isArray(updated)) {
        setHazards(updated.filter((h) => h && h.status !== 'cleared' && h.active !== false));
      }
    });
    const expiryTicker = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      unsubscribe();
      window.clearInterval(expiryTicker);
    };
  }, []);

  const freshHazards = useMemo(
    () => hazards.filter((h) => isTickerAlertFresh(h, nowMs)),
    [hazards, nowMs]
  );

  const hasActiveHazards = freshHazards.length > 0;

  const tickerItems: Array<
    | (CamgoHazard & { isPlaceholder?: false })
    | { id: string; title: string; location: string; severity: 'low'; isPlaceholder: true }
  > = hasActiveHazards
    ? freshHazards.map((h) => ({ ...h, isPlaceholder: false as const }))
    : [
        {
          id: 'empty-notice',
          title:
            language === 'bm'
              ? 'Tiada laporan insiden aktif daripada komuniti atau suapan berita dalam 24 jam lepas. Klik Ticker Live untuk lapor.'
              : 'No active community or news hazard reports in the last 24h. Click Live Ticker to report an incident.',
          location: 'CamGo Live',
          severity: 'low',
          isPlaceholder: true,
        },
      ];

  const getSeverityDotClass = (severity?: string, isPlaceholder?: boolean) => {
    if (isPlaceholder) return 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    switch (severity) {
      case 'critical':
        return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.95)] animate-ping';
      case 'high':
        return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.9)]';
      case 'medium':
      case 'moderate':
        return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]';
      default:
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    }
  };

  return (
    <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40 bg-stone-900/90 backdrop-blur-md border-y border-emerald-500/30 shadow-lg text-xs text-stone-200 flex items-center h-10 overflow-hidden select-none">
      {/* Left Alert Badge / Report Trigger */}
      <button
        type="button"
        onClick={onOpenReportModal}
        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold border-r border-emerald-500/30 shrink-0 cursor-pointer h-full transition-colors"
        title={language === 'bm' ? 'Siarkan Laporan Komuniti Baharu' : 'Publish New Community Report'}
      >
        <Megaphone className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
        <span className="hidden sm:inline font-mono font-black uppercase text-[10px]">
          {language === 'bm' ? 'Ticker Live' : 'Live Ticker'}
        </span>
        <PlusCircle className="w-3.5 h-3.5 text-emerald-300 ml-0.5" />
      </button>

      {/* Rolling Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center px-2">
        <div className="animate-marquee hover:[animation-play-state:paused] flex items-center gap-4 whitespace-nowrap">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => {
            const isNewsFeed = !item.isPlaceholder && item.verifiedBy === 'auto_news_feed';
            return (
              <button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => {
                  if (item.isPlaceholder) {
                    onOpenReportModal();
                  } else if (onSelectHazard) {
                    onSelectHazard(item);
                  }
                }}
                title={
                  item.isPlaceholder
                    ? language === 'bm'
                      ? 'Klik untuk hantar laporan komuniti'
                      : 'Click to submit a community incident report'
                    : language === 'bm'
                    ? 'Klik untuk buka lokasi di peta & ramalan aliran trafik AI'
                    : 'Click to open location on map & AI traffic flow prediction'
                }
                className="group inline-flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-emerald-500/15 border border-transparent hover:border-emerald-400/40 text-stone-200 transition-all cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${getSeverityDotClass(
                    item.severity,
                    item.isPlaceholder
                  )}`}
                />
                {isNewsFeed && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-mono font-black uppercase text-amber-300 shrink-0">
                    <Newspaper className="w-2.5 h-2.5" />
                    <span>{item.source || 'NEWS'}</span>
                  </span>
                )}
                <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                  [{(!item.isPlaceholder && item.corridor) || item.location || 'Highlands'}]
                </span>
                <span className="text-stone-300 font-medium group-hover:text-white group-hover:underline underline-offset-2 transition-colors">
                  {language === 'bm' && !item.isPlaceholder ? item.titleBm || item.title : item.title}
                </span>
                {!item.isPlaceholder && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[9.5px] font-mono font-bold text-emerald-300 group-hover:bg-emerald-500/30">
                    <MapPin className="w-2.5 h-2.5" />
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>{language === 'bm' ? 'Peta & AI' : 'Map & AI'}</span>
                  </span>
                )}
                <span className="text-stone-600 pl-1">•</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

