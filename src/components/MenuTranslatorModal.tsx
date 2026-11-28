import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Upload,
  X,
  ArrowLeft,
  Languages,
  Copy,
  Check,
  Volume2,
  Square,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  WifiOff,
  Loader2,
  Info,
  ScanText,
} from 'lucide-react';
import { Language } from '../types';

interface MenuTranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type TargetLanguageOption = {
  value: 'English' | 'Bahasa Melayu' | 'Mandarin' | 'Tamil' | 'Japanese' | 'Korean';
  label: string;
  nativeLabel: string;
  speechLang: string;
};

const TARGET_LANGUAGES: TargetLanguageOption[] = [
  { value: 'English', label: 'English', nativeLabel: 'EN', speechLang: 'en-MY' },
  { value: 'Bahasa Melayu', label: 'Bahasa Melayu', nativeLabel: 'BM', speechLang: 'ms-MY' },
  { value: 'Mandarin', label: 'Mandarin', nativeLabel: '中文', speechLang: 'zh-CN' },
  { value: 'Tamil', label: 'Tamil', nativeLabel: 'தமிழ்', speechLang: 'ta-IN' },
  { value: 'Japanese', label: 'Japanese', nativeLabel: '日本語', speechLang: 'ja-JP' },
  { value: 'Korean', label: 'Korean', nativeLabel: '한국어', speechLang: 'ko-KR' },
];

interface TranslationResult {
  detectedLanguage: string;
  summary: string;
  originalText: string;
  translatedText: string;
  contextNotes: Array<{ term: string; note: string }>;
  targetLanguage: string;
  model?: string;
}

interface CompressedImagePayload {
  base64: string;
  dataUrl: string;
  mimeType: string;
  sizeKb: number;
  width: number;
  height: number;
}

async function compressImageFile(file: File): Promise<CompressedImagePayload> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode selected image.'));
      image.src = objectUrl;
    });

    const maxDim = 1024;
    let targetW = img.naturalWidth || img.width || 1024;
    let targetH = img.naturalHeight || img.height || 1024;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, targetW);
    canvas.height = Math.max(1, targetH);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas is unavailable for image compression.');
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const base64 = dataUrl.split(',')[1] || '';
    if (!base64) {
      throw new Error('Failed to encode compressed image.');
    }

    const approxBytes = Math.round((base64.length * 3) / 4);
    return {
      base64,
      dataUrl,
      mimeType: 'image/jpeg',
      sizeKb: Math.max(1, Math.round(approxBytes / 1024)),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const MenuTranslatorModal: React.FC<MenuTranslatorModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const isBm = language === 'bm';

  const [targetLanguage, setTargetLanguage] = useState<TargetLanguageOption['value']>(() =>
    language === 'bm' ? 'Bahasa Melayu' : 'English'
  );
  const [compressedImage, setCompressedImage] = useState<CompressedImagePayload | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [errorState, setErrorState] = useState<{
    message: string;
    isRateLimit?: boolean;
    isOffline?: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'original' | 'translated' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
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

  const runTranslation = async (
    payload: CompressedImagePayload,
    lang: TargetLanguageOption['value']
  ) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorState({
        isOffline: true,
        message: isBm
          ? 'Anda sedang luar talian. Sambungkan internet sebentar untuk menterjemah gambar ini, kemudian cuba semula.'
          : 'You appear to be offline. Reconnect to mobile data or Wi-Fi and tap Retry.',
      });
      return;
    }

    setIsTranslating(true);
    setErrorState(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payload.base64,
          mimeType: payload.mimeType,
          targetLanguage: lang,
          uiLanguage: language,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429 || data?.code === 'RATE_LIMITED') {
          setErrorState({
            isRateLimit: true,
            message: isBm
              ? 'Had permintaan AI sedang sibuk sebentar (429). Sila tunggu beberapa saat dan tekan Cuba Lagi.'
              : 'Translation quota is momentarily busy (429). Please wait a few seconds and tap Retry.',
          });
          return;
        }
        throw new Error(
          data?.error ||
            (isBm
              ? 'Gagal menterjemah imej. Sila cuba gambar yang lebih jelas.'
              : 'Could not translate this image. Please try again with a clearer photo.')
        );
      }

      setResult({
        detectedLanguage: data.detectedLanguage || 'Detected Text',
        summary: data.summary || '',
        originalText: data.originalText || '',
        translatedText: data.translatedText || '',
        contextNotes: Array.isArray(data.contextNotes) ? data.contextNotes : [],
        targetLanguage: data.targetLanguage || lang,
        model: data.model,
      });
    } catch (err: any) {
      const msg = String(err?.message || '');
      const offline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        /failed to fetch|networkerror|load failed/i.test(msg);

      setErrorState({
        isOffline: offline,
        message: offline
          ? isBm
            ? 'Sambungan internet terputus. Sila semak liputan anda dan tekan Cuba Lagi.'
            : 'Network connection interrupted. Please check your signal and tap Retry.'
          : msg ||
            (isBm
              ? 'Ralat terjemahan berlaku. Sila cuba sebentar lagi.'
              : 'Something went wrong while translating. Please tap Retry.'),
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorState(null);
    setResult(null);
    setIsCompressing(true);

    try {
      const compressed = await compressImageFile(file);
      setCompressedImage(compressed);
      setIsCompressing(false);
      await runTranslation(compressed, targetLanguage);
    } catch (err: any) {
      setIsCompressing(false);
      setErrorState({
        message:
          err?.message ||
          (isBm
            ? 'Tidak dapat memproses fail imej tersebut. Sila pilih foto JPG atau PNG.'
            : 'Unable to process this image file. Please select a standard photo.'),
      });
    }
  };

  const handleLanguageChange = (newLang: TargetLanguageOption['value']) => {
    setTargetLanguage(newLang);
    if (compressedImage && !isTranslating && !isCompressing) {
      runTranslation(compressedImage, newLang);
    }
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCompressedImage(null);
    setResult(null);
    setErrorState(null);
  };

  const handleCopy = async (text: string, field: 'original' | 'translated') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleListen = () => {
    if (!result?.translatedText || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.translatedText);
    const langMeta =
      TARGET_LANGUAGES.find((t) => t.value === result.targetLanguage) ||
      TARGET_LANGUAGES.find((t) => t.value === targetLanguage) ||
      TARGET_LANGUAGES[0];

    utterance.lang = langMeta.speechLang;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const langPrefix = langMeta.speechLang.split('-')[0].toLowerCase();
      const exactVoice =
        voices.find((v) => v.lang.toLowerCase() === langMeta.speechLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (exactVoice) {
        utterance.voice = exactVoice;
      }
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[135] bg-stone-950 text-stone-100 flex flex-col overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Menu and Signboard Translator"
    >
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
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Sticky Top Header */}
      <header className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
            <ScanText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate leading-tight">
              {isBm ? 'Penterjemah Menu & Papan Tanda' : 'Menu & Signboard Translator'}
            </h2>
            <p className="text-[11px] text-stone-400 truncate">
              {isBm
                ? 'Imbas menu gerai, papan tanda jalan & notis hutan dengan AI'
                : 'Scan stall menus, road signboards & trail notices with AI'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable Body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 sm:px-6 py-5 pb-24"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Target Language Selector */}
          <section className="rounded-2xl bg-stone-900/90 border border-white/10 p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-200">
                <Languages className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{isBm ? 'Terjemah Ke Bahasa:' : 'Translate To:'}</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-teal-300">
                {targetLanguage}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TARGET_LANGUAGES.map((lang) => {
                const active = targetLanguage === lang.value;
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => handleLanguageChange(lang.value)}
                    disabled={isTranslating || isCompressing}
                    className={`px-2.5 py-2 rounded-xl text-center transition-all cursor-pointer border disabled:opacity-60 active:scale-95 ${
                      active
                        ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-[0_0_16px_rgba(45,212,191,0.2)]'
                        : 'bg-stone-950/80 border-white/10 text-stone-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-extrabold leading-tight truncate">
                      {lang.label}
                    </span>
                    <span className="block text-[10px] font-mono text-stone-400 mt-0.5">
                      {lang.nativeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Dual Input Action Buttons (Scan vs Upload) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing || isTranslating}
              className="group rounded-2xl p-4 bg-gradient-to-br from-emerald-950/90 via-stone-900 to-teal-950/85 border-2 border-emerald-400/60 hover:border-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.2)] flex items-center gap-3.5 text-left transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm sm:text-base font-heading font-black text-white">
                  {isBm ? 'Imbas untuk Terjemah' : 'Scan to Translate'}
                </span>
                <span className="block text-xs text-stone-300 mt-0.5">
                  {isBm
                    ? 'Buka kamera belakang untuk imbas menu atau papan tanda'
                    : 'Open rear camera to scan a menu or signboard'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isCompressing || isTranslating}
              className="group rounded-2xl p-4 bg-stone-900/95 border-2 border-cyan-400/45 hover:border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.14)] flex items-center gap-3.5 text-left transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm sm:text-base font-heading font-black text-white">
                  {isBm ? 'Muat Naik untuk Terjemah' : 'Upload to Translate'}
                </span>
                <span className="block text-xs text-stone-300 mt-0.5">
                  {isBm
                    ? 'Pilih foto dari galeri telefon atau fail imej anda'
                    : 'Choose a photo from your phone gallery or files'}
                </span>
              </div>
            </button>
          </section>

          {/* Image Preview Thumbnail + Retake / Choose Another */}
          {compressedImage && (
            <section className="rounded-2xl bg-stone-900/90 border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-36 h-40 sm:h-28 rounded-xl overflow-hidden bg-stone-950 border border-white/15 shrink-0 relative">
                <img
                  src={compressedImage.dataUrl}
                  alt="Captured menu or signboard preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/75 text-[10px] font-mono font-bold text-emerald-300 border border-white/15">
                  {compressedImage.sizeKb} KB
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-2.5 w-full">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">
                    {isBm ? 'Pratonton Gambar Dioptimumkan' : 'Optimized Photo Preview'}
                  </span>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {isBm
                      ? `Dimampatkan kepada ${compressedImage.width}×${compressedImage.height}px (${compressedImage.sizeKb} KB) untuk muat naik pantas.`
                      : `Compressed to ${compressedImage.width}×${compressedImage.height}px (${compressedImage.sizeKb} KB) for fast highland upload.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isTranslating}
                    className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/15 text-stone-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBm ? 'Ambil Semula / Pilih Lain' : 'Retake / Choose Another'}</span>
                  </button>

                  {!isTranslating && (
                    <button
                      type="button"
                      onClick={() => runTranslation(compressedImage, targetLanguage)}
                      className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isBm ? 'Terjemah Semula' : 'Re-translate'}</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Compressing / Translating Loading State */}
          {(isCompressing || isTranslating) && (
            <section className="rounded-2xl bg-stone-900/90 border border-teal-500/35 p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {isCompressing
                    ? isBm
                      ? 'Mengoptimumkan gambar di peranti anda...'
                      : 'Optimizing photo on your device...'
                    : isBm
                      ? `Membaca teks & menterjemah ke ${targetLanguage}...`
                      : `Reading text & translating into ${targetLanguage}...`}
                </p>
                <p className="text-xs text-stone-400">
                  {isBm
                    ? 'Mengenal pasti menu, harga dan nota konteks Malaysia.'
                    : 'Extracting items, prices, and local Malaysian context notes.'}
                </p>
              </div>
            </section>
          )}

          {/* Error State with Graceful Retry */}
          {errorState && !isTranslating && !isCompressing && (
            <section className="rounded-2xl bg-rose-950/35 border border-rose-500/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                  {errorState.isOffline ? (
                    <WifiOff className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-200">
                    {errorState.isRateLimit
                      ? isBm
                        ? 'Had Permintaan Sementara'
                        : 'Temporary Rate Limit'
                      : errorState.isOffline
                        ? isBm
                          ? 'Tiada Sambungan Internet'
                          : 'Offline Mode Detected'
                        : isBm
                          ? 'Terjemahan Tidak Berjaya'
                          : 'Translation Could Not Complete'}
                  </h3>
                  <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                    {errorState.message}
                  </p>
                </div>
              </div>

              {compressedImage && (
                <button
                  type="button"
                  onClick={() => runTranslation(compressedImage, targetLanguage)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isBm ? 'Cuba Lagi' : 'Retry'}</span>
                </button>
              )}
            </section>
          )}

          {/* Bilingual Results Display */}
          {result && !isTranslating && (
            <section className="space-y-4 animate-in fade-in duration-200">
              {result.summary && (
                <div className="rounded-2xl bg-emerald-950/35 border border-emerald-500/30 px-4 py-3 flex items-center gap-2.5 text-xs text-emerald-200">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{result.summary}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detected Original Text Card */}
                <div className="rounded-2xl bg-stone-900/95 border border-white/10 p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block">
                          {isBm ? 'Teks Asal Dikesan' : 'Detected Original Text'}
                        </span>
                        <span className="text-xs font-bold text-amber-300 truncate block">
                          {result.detectedLanguage}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.originalText, 'original')}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {copiedField === 'original' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isBm ? 'Disalin' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isBm ? 'Salin' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-200 whitespace-pre-line leading-relaxed break-words">
                      {result.originalText ||
                        (isBm ? 'Tiada teks jelas dikesan.' : 'No clear text detected.')}
                    </p>
                  </div>
                </div>

                {/* Translated Text Card */}
                <div className="rounded-2xl bg-gradient-to-b from-teal-950/50 to-stone-900/95 border border-teal-400/40 p-4 flex flex-col justify-between gap-3 shadow-lg">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-300 block">
                          {isBm ? 'Teks Terjemahan' : 'Translated Text'}
                        </span>
                        <span className="text-xs font-bold text-white truncate block">
                          {result.targetLanguage}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleListen}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                            isSpeaking
                              ? 'bg-rose-600/80 border-rose-400 text-white'
                              : 'bg-teal-500/20 hover:bg-teal-500/30 border-teal-400/40 text-teal-200'
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>{isBm ? 'Henti' : 'Stop'}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{isBm ? 'Dengar' : 'Listen'}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(result.translatedText, 'translated')}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedField === 'translated' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isBm ? 'Disalin' : 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{isBm ? 'Salin' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm sm:text-[15px] text-white font-medium whitespace-pre-line leading-relaxed break-words">
                      {result.translatedText ||
                        (isBm ? 'Tiada terjemahan dijana.' : 'No translation generated.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Local Malaysian Context Notes */}
              {result.contextNotes.length > 0 && (
                <div className="rounded-2xl bg-stone-900/90 border border-amber-500/30 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      {isBm
                        ? 'Nota Konteks Tempatan Malaysia & Cameron'
                        : 'Local Malaysian & Highland Context Notes'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.contextNotes.map((item, idx) => (
                      <div
                        key={`${item.term}-${idx}`}
                        className="rounded-xl bg-stone-950/80 border border-white/10 p-3 space-y-1"
                      >
                        <span className="text-xs font-bold text-amber-200 block">
                          {item.term}
                        </span>
                        <p className="text-xs text-stone-300 leading-relaxed">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Helpful Empty State */}
          {!compressedImage && !isCompressing && !isTranslating && !errorState && (
            <section className="rounded-2xl bg-stone-900/70 border border-white/10 p-5 text-center space-y-2">
              <p className="text-xs sm:text-sm font-bold text-stone-200">
                {isBm
                  ? 'Sesuai untuk menu pasar malam, papan tanda gerai, dan notis denai hutan'
                  : 'Great for Pasar Malam stall menus, restaurant signboards, and forest trail notices'}
              </p>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                {isBm
                  ? 'Foto dimampatkan secara automatik di telefon anda sebelum diterjemah supaya kekal pantas walaupun liputan tanah tinggi lemah.'
                  : 'Photos are compressed right in your browser before translating so it stays fast even on weak Cameron Highlands mobile signals.'}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
