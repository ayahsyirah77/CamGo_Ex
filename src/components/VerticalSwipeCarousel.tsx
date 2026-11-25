import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface VerticalSwipeCarouselProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  heightClassName?: string;
  accentColor?: 'emerald' | 'cyan';
  showNavArrows?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function VerticalSwipeCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  heightClassName = 'h-[480px] sm:h-[530px]',
  accentColor = 'emerald',
  showNavArrows = false,
  emptyState = null,
  className = '',
}: VerticalSwipeCarouselProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      setActiveIndex(0);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [items.length, activeIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientHeight <= 0) return;
    const nextIdx = Math.round(el.scrollTop / el.clientHeight);
    const clamped = Math.max(0, Math.min(items.length - 1, nextIdx));
    setActiveIndex(clamped);
  }, [items.length]);

  const scrollToIndex = useCallback(
    (idx: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      el.scrollTo({
        top: clamped * el.clientHeight,
        behavior: 'smooth',
      });
      setActiveIndex(clamped);
    },
    [items.length]
  );

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  const hasMultiple = items.length > 1;
  const activeDotClass =
    accentColor === 'cyan'
      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.65)]'
      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]';
  const badgeAccentClass =
    accentColor === 'cyan'
      ? 'border-cyan-400/35 text-cyan-200'
      : 'border-emerald-400/35 text-emerald-200';

  return (
    <div className={`relative w-full ${className}`}>
      {/* Stacked Deck Depth Hints Underneath when more cards exist */}
      {hasMultiple && activeIndex < items.length - 1 && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1.5 inset-x-3 h-4 rounded-b-3xl bg-stone-900/85 border border-t-0 border-white/15 -z-10"
          />
          {activeIndex < items.length - 2 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 inset-x-6 h-4 rounded-b-3xl bg-stone-950/75 border border-t-0 border-white/10 -z-20"
            />
          )}
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`w-full ${heightClassName} overflow-y-auto snap-y snap-mandatory touch-pan-y overscroll-contain no-scrollbar rounded-3xl`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, idx) => (
          <div
            key={keyExtractor(item, idx)}
            className={`snap-start snap-always h-full w-full shrink-0 ${
              hasMultiple ? 'pr-9 sm:pr-11' : ''
            }`}
          >
            {renderItem(item, idx, idx === activeIndex)}
          </div>
        ))}
      </div>

      {/* Vertical Position Indicator: 1 / N Badge + Pagination Dots + Optional Arrows */}
      {hasMultiple && (
        <div className="absolute top-1/2 -translate-y-1/2 right-1 sm:right-1.5 z-20 flex flex-col items-center gap-1.5 pointer-events-auto">
          <div
            className={`no-mobile-clamp px-1.5 py-0.5 rounded-full bg-stone-950/90 backdrop-blur-md border text-[9px] font-mono font-bold tabular-nums shadow-md select-none ${badgeAccentClass}`}
          >
            {activeIndex + 1}/{items.length}
          </div>

          {showNavArrows && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(activeIndex - 1);
              }}
              disabled={activeIndex === 0}
              aria-label="Previous card"
              className="w-7 h-7 rounded-full bg-stone-950/85 hover:bg-stone-900 border border-white/15 text-stone-200 hover:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer transition-opacity shadow-md"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            className="flex flex-col items-center gap-1.5 py-1.5 px-1 rounded-full bg-stone-950/80 backdrop-blur-md border border-white/10 shadow-lg"
            role="tablist"
            aria-label="Card stack position"
          >
            {items.slice(0, 12).map((_, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Card ${idx + 1} of ${items.length}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToIndex(idx);
                  }}
                  className={`rounded-full transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? `w-1.5 h-4 ${activeDotClass}`
                      : 'w-1.5 h-1.5 bg-stone-500/70 hover:bg-stone-300'
                  }`}
                />
              );
            })}
            {items.length > 12 && (
              <span className="no-mobile-clamp text-[8px] font-mono text-stone-400 leading-none">
                +{items.length - 12}
              </span>
            )}
          </div>

          {showNavArrows && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(activeIndex + 1);
              }}
              disabled={activeIndex >= items.length - 1}
              aria-label="Next card"
              className="w-7 h-7 rounded-full bg-stone-950/85 hover:bg-stone-900 border border-white/15 text-stone-200 hover:text-white disabled:opacity-30 flex items-center justify-center cursor-pointer transition-opacity shadow-md"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
