/**
 * Community Ticker Marquee Component (CommunityTicker.tsx)
 * Fetches approved peer hazard reports & announcements in real-time from Firestore ('camgo_hazards'),
 * rendering a sleek continuous scrolling ticker banner matching CamGo's dark theme.
 * Positioned in mobile view strictly above the sticky bottom footer (bottom-16 z-40).
 */

import React, { useState, useEffect } from 'react';
import { Megaphone, PlusCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Language, CamgoHazard } from '../types';
import { camgoHazardsService } from '../services/camgoHazardsService';

interface CommunityTickerProps {
  language: Language;
  onOpenReportModal: () => void;
}

export const CommunityTicker: React.FC<CommunityTickerProps> = ({ language, onOpenReportModal }) => {
  const [hazards, setHazards] = useState<CamgoHazard[]>(() =>
    camgoHazardsService.getCachedActiveHazards()
  );

  useEffect(() => {
    const unsubscribe = camgoHazardsService.subscribeActiveHazards((updated) => {
      if (Array.isArray(updated) && updated.length > 0) {
        setHazards(updated.filter((h) => h && h.status !== 'cleared'));
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const tickerItems =
    hazards.length > 0
      ? hazards
      : [
          {
            id: 'default-1',
            title: language === 'bm' ? 'Laluan Simpang Pulai (FT185) dibuka & lancar.' : 'Simpang Pulai Route (FT185) open and flowing smoothly.',
            location: 'FT185',
            severity: 'low',
          },
          {
            id: 'default-2',
            title: language === 'bm' ? 'Pasar Malam Golden Hills dibuka 4 petang hingga 9 malam.' : 'Golden Hills Night Market active from 4 PM to 9 PM.',
            location: 'Golden Hills',
            severity: 'moderate',
          },
          {
            id: 'default-3',
            title: language === 'bm' ? 'Suhu malam turun ke 14°C, pastikan memakai pakaian tebal.' : 'Night temperature drops to 14°C, please wear warm layers.',
            location: 'Cameron Highlands',
            severity: 'low',
          },
        ];

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
        <div className="animate-marquee hover:[animation-play-state:paused] flex items-center gap-8 whitespace-nowrap cursor-default">
          {/* Duplicate array twice for seamless infinite marquee loop */}
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="inline-flex items-center gap-2 text-stone-200"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="font-bold text-white">
                [{item.location || 'Highlands'}]
              </span>
              <span className="text-stone-300 font-medium">
                {language === 'bm' ? (item as any).titleBm || item.title : item.title}
              </span>
              <span className="text-stone-600 px-1">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
