import React, { useState, useRef, useCallback } from 'react';
import {
  Globe,
  Loader2,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react';
import { Language } from '../types';

export interface WebSearchSource {
  title: string;
  url: string;
}

export interface WebSearchState {
  searchedQuery: string;
  answer: string | null;
  sources: WebSearchSource[];
  webQueries: string[];
  isSearching: boolean;
  error: string | null;
}

export function useWebSearch(language: Language) {
  const [state, setState] = useState<WebSearchState>({
    searchedQuery: '',
    answer: null,
    sources: [],
    webQueries: [],
    isSearching: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const clearWebSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState({
      searchedQuery: '',
      answer: null,
      sources: [],
      webQueries: [],
      isSearching: false,
      error: null,
    });
  }, []);

  const runWebSearch = useCallback(
    async (rawQuery: string) => {
      const cleanQuery = rawQuery.trim();
      if (!cleanQuery) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        searchedQuery: cleanQuery,
        answer: null,
        sources: [],
        webQueries: [],
        isSearching: true,
        error: null,
      });

      try {
        const res = await fetch('/api/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cleanQuery, language }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Web search failed (${res.status})`);
        }

        setState({
          searchedQuery: cleanQuery,
          answer: typeof data.answer === 'string' ? data.answer : '',
          sources: Array.isArray(data.sources) ? data.sources : [],
          webQueries: Array.isArray(data.webQueries) ? data.webQueries : [],
          isSearching: false,
          error: null,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setState((prev) => ({
          ...prev,
          searchedQuery: cleanQuery,
          isSearching: false,
          error:
            err?.message ||
            (language === 'bm'
              ? 'Gagal mendapatkan jawapan carian web.'
              : 'Unable to fetch live web answer right now.'),
        }));
      }
    },
    [language]
  );

  return {
    webSearch: state,
    runWebSearch,
    clearWebSearch,
  };
}

// Safely render lightweight inline **bold** segments without raw HTML injection
const renderFormattedText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const renderMarkdownAnswer = (answer: string) => {
  const lines = answer.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-stone-200 leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const cleanHeading = line.replace(/^#{1,3}\s+/, '');
          return (
            <div key={idx} className="font-bold text-emerald-300 text-xs pt-1">
              {renderFormattedText(cleanHeading)}
            </div>
          );
        }

        if (/^([-*•]|\d+\.)\s+/.test(line)) {
          const bulletContent = line.replace(/^([-*•]|\d+\.)\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-bold mt-0.5 shrink-0">•</span>
              <span className="flex-1">{renderFormattedText(bulletContent)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderFormattedText(line)}</p>;
      })}
    </div>
  );
};

interface WebSearchResultsBlockProps {
  query: string;
  language: Language;
  webSearch: WebSearchState;
  onRunWebSearch: (query: string) => void;
  onClearWebSearch: () => void;
  hasLocalResults: boolean;
}

export const WebSearchResultsBlock: React.FC<WebSearchResultsBlockProps> = ({
  query,
  language,
  webSearch,
  onRunWebSearch,
  onClearWebSearch,
  hasLocalResults,
}) => {
  const [copied, setCopied] = useState(false);
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  const isCurrentQuerySearched =
    webSearch.searchedQuery.toLowerCase() === trimmedQuery.toLowerCase() &&
    (webSearch.isSearching || webSearch.answer !== null || webSearch.error !== null);

  const handleCopy = () => {
    if (!webSearch.answer) return;
    navigator.clipboard?.writeText(webSearch.answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  return (
    <div className="space-y-2 pt-1 border-t border-white/10">
      {/* Action Prompt to trigger Web Search when current query hasn't been web-searched yet */}
      {!isCurrentQuerySearched && (
        <button
          type="button"
          onClick={() => onRunWebSearch(trimmedQuery)}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer group ${
            hasLocalResults
              ? 'bg-stone-950/70 hover:bg-cyan-950/40 border-white/10 hover:border-cyan-500/40'
              : 'bg-gradient-to-r from-cyan-950/60 via-stone-900 to-emerald-950/60 hover:from-cyan-900/60 hover:to-emerald-900/60 border-cyan-500/40 shadow-md'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                {language === 'bm'
                  ? `Cari di Web untuk "${trimmedQuery}"`
                  : `Search the Web for "${trimmedQuery}"`}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                {language === 'bm'
                  ? 'Dapatkan jawapan langsung dari web di luar direktori CamGo (Tekan Enter)'
                  : 'Get live web answers & sources beyond website directories (or press Enter)'}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-600 group-hover:bg-cyan-500 text-white text-[11px] font-bold shrink-0">
            {language === 'bm' ? 'Cari Web' : 'Search Web'}
          </span>
        </button>
      )}

      {/* Loading State */}
      {webSearch.isSearching && (
        <div className="p-4 rounded-xl bg-stone-950/80 border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-200">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="font-bold truncate">
              {language === 'bm'
                ? `Mencari jawapan web untuk "${webSearch.searchedQuery}"...`
                : `Searching the live web for "${webSearch.searchedQuery}"...`}
            </p>
            <p className="text-[10px] text-stone-400">
              {language === 'bm'
                ? 'Mengumpulkan fakta dan sumber web terkini...'
                : 'Gathering live web facts & verified source citations...'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!webSearch.isSearching && webSearch.error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between gap-2 text-xs text-rose-200">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-rose-200">
                {language === 'bm' ? 'Ralat Carian Web' : 'Web Search Unavailable'}
              </p>
              <p className="text-[11px] text-rose-300/90 break-words">{webSearch.error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRunWebSearch(webSearch.searchedQuery || trimmedQuery)}
            className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-100 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{language === 'bm' ? 'Cuba Lagi' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* Live Web Answer Card */}
      {!webSearch.isSearching && !webSearch.error && webSearch.answer && (
        <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-cyan-500/35 space-y-3 shadow-inner">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{language === 'bm' ? 'Jawapan Web Langsung' : 'Live Web Answer'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-[9px] font-mono text-cyan-200 border border-cyan-500/20">
                    Web Grounded
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  {webSearch.searchedQuery}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title={language === 'bm' ? 'Salin jawapan' : 'Copy answer'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClearWebSearch}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                title="Dismiss web answer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto pr-1">{renderMarkdownAnswer(webSearch.answer)}</div>

          {webSearch.sources.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                {language === 'bm'
                  ? `Sumber Web (${webSearch.sources.length})`
                  : `Web Sources (${webSearch.sources.length})`}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {webSearch.sources.slice(0, 6).map((src, idx) => (
                  <a
                    key={`${src.url}-${idx}`}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 hover:border-cyan-500/40 text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 max-w-[220px] transition-colors"
                  >
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{src.title || src.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
