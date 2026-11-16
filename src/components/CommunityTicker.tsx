/**
 * Community Ticker Marquee Component (CommunityTicker.tsx)
 * Fetches approved peer hazard reports & announcements in real-time from Firestore ('camgo_hazards'),
 * rendering a sleek continuous scrolling ticker banner matching CamGo's dark theme.
 * Positioned in mobile view strictly above the sticky bottom footer (bottom-16 z-40).
 */

import React, { useState, useEffect } from 'react';
import { Megaphone, PlusCircle, MapPin, Sparkles } from 'lucide-react';
import { Language, CamgoHazard } from '../types';
import { camgoHazardsService } from '../services/camgoHazardsService';

interface CommunityTickerProps {
  language: Language;
  onOpenReportModal: () => void;
  onSelectHazard?: (hazard: CamgoHazard) => void;
}

export const CommunityTicker: React.FC<CommunityTickerProps> = ({
  language,
  onOpenReportModal,
  onSelectHazard,
}) => {
  const [hazards, setHazards] = useState<CamgoHazard[]>(() =>
    camgoHazardsService.getCachedActiveHazards()
  );

  useEffect(() => {
    const unsubscribe = camgoHazardsService.subscribeActiveHazards((updated) => {
      if (Array.isArray(updated)) {
        setHazards(updated.filter((h) => h && h.status !== 'cleared'));
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const hasActiveHazards = hazards.length > 0;

  const tickerItems: Array<
    | (CamgoHazard & { isPlaceholder?: false })
    | { id: string; title: string; location: string; severity: 'low'; isPlaceholder: true }
  > = hasActiveHazards
    ? hazards.map((h) => ({ ...h, isPlaceholder: false as const }))
    : [
        {
          id: 'empty-notice',
          title:
            language === 'bm'
              ? 'Tiada laporan insiden aktif daripada komuniti atau admin. Klik Ticker Live untuk hantar laporan.'
              : 'No active community or admin incident reports at this moment. Click Ticker Live to report an incident.',
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
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
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
              <span className={`w-2 h-2 rounded-full shrink-0 ${getSeverityDotClass(item.severity, item.isPlaceholder)}`} />
              <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                [{item.location || 'Highlands'}]
              </span>
              <span className="text-stone-300 font-medium group-hover:text-white group-hover:underline underline-offset-2 transition-colors">
                {language === 'bm' ? (item as any).titleBm || item.title : item.title}
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
          ))}
        </div>
      </div>
    </div>
  );
};

