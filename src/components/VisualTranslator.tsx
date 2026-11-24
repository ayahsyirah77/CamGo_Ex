import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Languages,
  AlertTriangle,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
  Utensils,
  Signpost,
  Trees,
  Store,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';
import {
  translateMenuOrSignImage,
  getDailyScanUsage,
  DAILY_TRANSLATOR_SCAN_LIMIT,
  VisualTranslationResult,
  TranslationCategory,
} from '../services/visualTranslator';

interface VisualTranslatorProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

function getCategoryIcon(category: TranslationCategory) {
  switch (category) {
    case 'Menu / Food Stall':
      return <Utensils className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'Road / Traffic Sign':
      return <Signpost className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'Trail / Park Notice':
      return <Trees className="w-4 h-4 text-teal-400 shrink-0" />;
    default:
      return <Store className="w-4 h-4 text-sky-400 shrink-0" />;
  }
}

function getTagBadgeClasses(tag: string): string {
  const lower = tag.toLowerCase();
  if (
    lower.includes('closed') ||
    lower.includes('non-halal') ||
    lower.includes('pork') ||
    lower.includes('no parking') ||
    lower.includes('fine') ||
    lower.includes('penalty') ||
    lower.includes('landslide') ||
    lower.includes('danger')
  ) {
    return 'bg-rose-500/20 text-rose-200 border-rose-500/45';
  }
  if (
    lower.includes('spicy') ||
    lower.includes('nut') ||
    lower.includes('seafood') ||
    lower.includes('allergen') ||
    lower.includes('permit') ||
    lower.includes('detour') ||
    lower.includes('warning')
  ) {
    return 'bg-amber-500/20 text-amber-200 border-amber-500/45';
  }
  if (lower.includes('halal') || lower.includes('vegetarian') || lower.includes('vegan')) {
    return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/45';
  }
  return 'bg-stone-800 text-stone-200 border-white/15';
}

export const VisualTranslator: React.FC<VisualTranslatorProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VisualTranslationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [quota, setQuota] = useState(() => getDailyScanUsage());

  useEffect(() => {
    if (isOpen) {
      setQuota(getDailyScanUsage());
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    stopSpeech();
    setErrorMsg(null);
    setResult(null);
    setCopied(false);

    const objectPreview = URL.createObjectURL(file);
    setPreviewUrl(objectPreview);
    setIsScanning(true);

    try {
      const scanRes = await translateMenuOrSignImage(file);
      URL.revokeObjectURL(objectPreview);
      setPreviewUrl(scanRes.previewDataUrl);
      setResult(scanRes.result);
      setQuota({
        used: DAILY_TRANSLATOR_SCAN_LIMIT - scanRes.remainingScansToday,
        remaining: scanRes.remainingScansToday,
        limit: scanRes.dailyLimit,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to translate this photo right now. Please try again.'
      );
      setQuota(getDailyScanUsage());
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    stopSpeech();
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg(null);
    setCopied(false);
  };

  const handleCopyTranslation = async () => {
    if (!result) return;
    const lines: string[] = [
      `[${result.detectedCategory}]`,
      result.overallSummaryEn,
    ];
    if (result.urgentWarning) {
      lines.push(`WARNING: ${result.urgentWarning}`);
    }
    if (result.items.length > 0) {
      lines.push('');
      for (const item of result.items) {
        const parts = [`• ${item.englishTranslation}`];
        if (item.priceOrDetail) parts.push(`(${item.priceOrDetail})`);
        if (item.dietaryOrSafetyTag) parts.push(`[${item.dietaryOrSafetyTag}]`);
        if (item.originalText) parts.push(`— ${item.originalText}`);
        if (item.localNote) parts.push(`Note: ${item.localNote}`);
        lines.push(parts.join(' '));
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleSpeakSummary = () => {
    if (!result || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();

    const speechSegments: string[] = [];
    if (result.urgentWarning) {
      speechSegments.push(`Important alert: ${result.urgentWarning}`);
    }
    if (result.overallSummaryEn) {
      speechSegments.push(result.overallSummaryEn);
    } else if (result.items.length > 0) {
      speechSegments.push(
        result.items
          .slice(0, 6)
          .map((i) => `${i.englishTranslation}${i.priceOrDetail ? `, ${i.priceOrDetail}` : ''}`)
          .join('. ')
      );
    }

    const textToSpeak = speechSegments.join('. ').trim();
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = 'en-GB';
    }
    utterance.rate = 0.96;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div
      className="fixed inset-0 z-[135] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-stone-950 border border-emerald-500/35 shadow-2xl overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-white/10 bg-stone-950/95 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Penterjemah Menu & Papan Tanda' : 'Menu & Sign Translator'}
              </h2>
              <p className="text-[11px] text-stone-400 truncate tabular-nums">
                BM / Chinese / Tamil → English · {quota.remaining}/{quota.limit} scans left today
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close translator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />

          {/* Primary Action Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isScanning || quota.remaining <= 0}
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98] transition-all"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Snap Menu or Sign</span>
            </button>

            <button
              type="button"
              disabled={isScanning || quota.remaining <= 0}
              onClick={() => uploadInputRef.current?.click()}
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed text-stone-100 border border-emerald-500/40 hover:border-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Upload Photo</span>
            </button>
          </div>

          {/* Empty State Helper */}
          {!previewUrl && !isScanning && !result && !errorMsg && (
            <div className="rounded-2xl bg-stone-900/90 border border-white/10 p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-300 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">
                    Instant Local Translation &amp; Highland Context
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Point your camera at warung menus, Pasar Malam food labels, JKR road closure signs, or Forestry trail notices. Get English translations, prices, allergen/halal notes, and detour guidance.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-stone-300">
                <div className="rounded-xl bg-stone-950/80 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Menus &amp; Stalls</span>
                </div>
                <div className="rounded-xl bg-stone-950/80 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                  <Signpost className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">JKR Road Signs</span>
                </div>
                <div className="rounded-xl bg-stone-950/80 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                  <Trees className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">Trail Notices</span>
                </div>
                <div className="rounded-xl bg-stone-950/80 border border-white/10 px-2.5 py-2 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">Shop Labels</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-2xl bg-rose-950/75 border border-rose-500/60 p-4 flex items-start gap-3 text-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="text-xs font-black uppercase tracking-wide text-rose-300">
                  Translation Error
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Preview + Scanning State */}
          {previewUrl && (
            <div className="rounded-2xl bg-stone-900/90 border border-white/10 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={previewUrl}
                  alt="Captured signboard or menu preview"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-white/15 bg-stone-950 shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  {isScanning ? (
                    <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-bold">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Reading &amp; translating text...</span>
                    </div>
                  ) : result ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                        {getCategoryIcon(result.detectedCategory)}
                        <span className="truncate">{result.detectedCategory}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(result.detectedLanguages.length > 0
                          ? result.detectedLanguages
                          : ['Local Signage']
                        ).map((langLabel) => (
                          <span
                            key={langLabel}
                            className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-[10px] font-semibold text-emerald-200"
                          >
                            {langLabel}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-stone-300 font-medium">
                      Photo ready — tap Snap or Upload to retry.
                    </div>
                  )}
                </div>
              </div>

              {!isScanning && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          )}

          {/* Translation Output */}
          {result && !isScanning && (
            <>
              {!result.hasReadableText ? (
                <div className="rounded-2xl bg-amber-950/55 border border-amber-500/50 p-4 flex items-start gap-3 text-amber-100">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-amber-200">
                      Unable to Read Sign Clearly
                    </div>
                    <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                      No clear text detected—move closer to the menu or signboard and ensure good lighting.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Urgent Warning Banner */}
                  {result.urgentWarning && (
                    <div className="rounded-2xl bg-gradient-to-r from-rose-950/90 via-amber-950/85 to-rose-950/90 border-2 border-amber-400/75 p-3.5 sm:p-4 flex items-start gap-3 shadow-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                          Important Notice / Advisory
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                          {result.urgentWarning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Takeaway Summary */}
                  <div className="rounded-2xl bg-emerald-950/40 border border-emerald-400/40 p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                        Quick Takeaway
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                        {result.overallSummaryEn ||
                          'Translated items are listed below.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleCopyTranslation}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/15 text-xs font-bold text-stone-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copy Translation</span>
                          </>
                        )}
                      </button>

                      {speechSupported && (
                        <button
                          type="button"
                          onClick={handleSpeakSummary}
                          className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isSpeaking
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                              : 'bg-stone-900 hover:bg-stone-800 border-white/15 text-stone-100'
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                              <span>Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Speak Summary</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scannable Translated Items */}
                  {result.items.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-stone-300">
                          Translated Details ({result.items.length})
                        </span>
                      </div>

                      <div className="divide-y divide-white/10 rounded-2xl bg-stone-900/90 border border-white/10 overflow-hidden">
                        {result.items.map((item, idx) => (
                          <div
                            key={`${item.originalText}-${idx}`}
                            className="p-3.5 sm:p-4 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="text-sm sm:text-base font-bold text-white leading-snug">
                                  {item.englishTranslation}
                                </div>
                                {item.originalText && (
                                  <div className="text-xs text-stone-400 leading-snug break-words">
                                    {item.originalText}
                                  </div>
                                )}
                              </div>

                              {item.priceOrDetail && (
                                <span className="px-2.5 py-1 rounded-lg bg-stone-950 border border-emerald-400/35 text-emerald-300 font-mono font-bold text-xs tabular-nums shrink-0">
                                  {item.priceOrDetail}
                                </span>
                              )}
                            </div>

                            {(item.dietaryOrSafetyTag || item.localNote) && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {item.dietaryOrSafetyTag && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${getTagBadgeClasses(
                                      item.dietaryOrSafetyTag
                                    )}`}
                                  >
                                    {item.dietaryOrSafetyTag}
                                  </span>
                                )}
                                {item.localNote && (
                                  <span className="text-xs text-stone-300 leading-snug">
                                    {item.localNote}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
