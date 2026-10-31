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
    <div
      className="fixed inset-0 z-[120] p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-start sm:items-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-2xl mt-12 sm:mt-0 my-auto rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)] p-4 sm:p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block leading-tight">
                {language === 'bm' ? 'Utiliti Pelawat & Pertukaran' : 'Traveler Utility & Conversion'}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                🇸🇬 SGD → MYR Real-Time Currency Converter
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close currency converter modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4">
          <CurrencyConverterWidget language={language} />
        </div>
      </div>
    </div>
  );
};
