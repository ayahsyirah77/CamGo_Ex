/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { Language } from '../types';
import { CurrencyConverterWidget } from './CurrencyConverterWidget';

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-stone-950 text-stone-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Sticky Full-Page Header Bar */}
      <div className="shrink-0 z-30 flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block leading-tight">
              {language === 'bm' ? 'Utiliti Pelawat & Pertukaran' : 'Traveler Utility & Conversion'}
            </span>
            <h3 className="no-mobile-clamp text-sm sm:text-base font-bold text-white leading-tight truncate">
              🇸🇬 SGD → MYR Real-Time Currency Converter
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6 pb-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <CurrencyConverterWidget language={language} />
        </div>
      </div>
    </div>
  );
};
