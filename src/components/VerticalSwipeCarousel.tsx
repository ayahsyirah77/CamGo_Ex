import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface VerticalSwipeCarouselProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  heightClassName?: string;
  deckTitle?: string;
  deckSubtitle?: string;
  accentColor?: 'emerald' | 'cyan';
  showNavArrows?: boolean;
  isLoading?: boolean;
  skeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

const SWIPE_THRESHOLD_PX = 60;
const VELOCITY_THRESHOLD = 0.45;
const TRANSITION_MS = 250;

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [data-no-swipe="true"], [data-card-scrollable="true"]';

export function VerticalSwipeCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  heightClassName = 'h-[340px] sm:h-[360px]',
  deckTitle,
  deckSubtitle,
  accentColor = 'emerald',
  showNavArrows = true,
  isLoading = false,
  skeleton = null,
  emptyState = null,
  className = '',
}: VerticalSwipeCarouselProps<T>) {
  const deckRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyState, setFlyState] = useState<'idle' | 'exit-up' | 'enter-down'>('idle');
  const [deckHeight, setDeckHeight] = useState(340);

  const dragSessionRef = useRef<{
    active: boolean;
    dragging: boolean;
    startY: number;
    startX: number;
    startTime: number;
    currentY: number;
  }>({
    active: false,
    dragging: false,
    startY: 0,
    startX: 0,
    startTime: 0,
    currentY: 0,
  });

  const suppressClickRef = useRef(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelLockUntilRef = useRef(0);

  const count = items.length;
  const hasMultiple = count > 1;

  // Keep activeIndex valid when items list changes
  useEffect(() => {
    if (count > 0 && activeIndex >= count) {
      setActiveIndex(0);
      setDragOffsetY(0);
      setIsDragging(false);
      setFlyState('idle');
    }
  }, [count, activeIndex]);

  // Track rendered card deck height for smooth pull-down distance calculation
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientHeight > 0) {
        setDeckHeight(el.clientHeight);
      }
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [heightClassName, count, isLoading]);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const triggerNext = useCallback(() => {
    if (count <= 1 || flyState !== 'idle') return;
    setIsDragging(false);
    setDragOffsetY(0);
    setFlyState('exit-up');

    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % count);
      setFlyState('idle');
    }, TRANSITION_MS);
  }, [count, flyState]);

  const triggerPrev = useCallback(() => {
    if (count <= 1 || flyState !== 'idle') return;
    setIsDragging(false);
    setDragOffsetY(0);
    setFlyState('enter-down');

    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev - 1 + count) % count);
      setFlyState('idle');
    }, TRANSITION_MS);
  }, [count, flyState]);

  // Native non-passive touchmove & wheel scroll lock on the card deck container
  useEffect(() => {
    const el = deckRef.current;
    if (!el || !hasMultiple) return;

    const handleNativeTouchMove = (e: TouchEvent) => {
      const session = dragSessionRef.current;
      if (!session.active) return;
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleNativeWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-card-scrollable="true"]')) return;

      if (Math.abs(e.deltaY) < 20) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const now = Date.now();
      if (now < wheelLockUntilRef.current || flyState !== 'idle') return;
      wheelLockUntilRef.current = now + 320;
      if (e.deltaY > 0) {
        triggerNext();
      } else {
        triggerPrev();
      }
    };

    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('touchmove', handleNativeTouchMove);
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [hasMultiple, flyState, triggerNext, triggerPrev]);

  const scheduleSuppressReset = useCallback(() => {
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
  }, []);

  const finishDrag = useCallback(
    (deltaY: number, startTime: number) => {
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = deltaY / elapsed;

      if (deltaY <= -SWIPE_THRESHOLD_PX || (velocity <= -VELOCITY_THRESHOLD && deltaY <= -24)) {
        triggerNext();
      } else if (deltaY >= SWIPE_THRESHOLD_PX || (velocity >= VELOCITY_THRESHOLD && deltaY >= 24)) {
        triggerPrev();
      } else {
        setIsDragging(false);
        setDragOffsetY(0);
      }
      scheduleSuppressReset();
    },
    [triggerNext, triggerPrev, scheduleSuppressReset]
  );

  // Mobile Touch Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple || flyState !== 'idle' || e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE_SELECTOR)) return;

    const touch = e.touches[0];
    suppressClickRef.current = false;
    dragSessionRef.current = {
      active: true,
      dragging: false,
      startY: touch.clientY,
      startX: touch.clientX,
      startTime: Date.now(),
      currentY: 0,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session.active || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dy = touch.clientY - session.startY;
    const dx = touch.clientX - session.startX;

    if (!session.dragging) {
      if (Math.abs(dy) > 6 && Math.abs(dy) >= Math.abs(dx) * 0.85) {
        session.dragging = true;
        setIsDragging(true);
      } else if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        session.active = false;
        return;
      }
    }

    if (session.dragging) {
      if (Math.abs(dy) > 10) {
        suppressClickRef.current = true;
      }
      session.currentY = dy;
      setDragOffsetY(dy);
    }
  };

  const handleTouchEnd = () => {
    const session = dragSessionRef.current;
    if (!session.active) return;
    const wasDragging = session.dragging;
    const deltaY = session.currentY;
    const startTime = session.startTime;
    session.active = false;
    session.dragging = false;

    if (wasDragging) {
      finishDrag(deltaY, startTime);
    } else {
      setIsDragging(false);
      setDragOffsetY(0);
      suppressClickRef.current = false;
    }
  };

  // Desktop Mouse Drag Gesture Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !hasMultiple || flyState !== 'idle') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE_SELECTOR)) return;

    suppressClickRef.current = false;
    dragSessionRef.current = {
      active: true,
      dragging: false,
      startY: e.clientY,
      startX: e.clientX,
      startTime: Date.now(),
      currentY: 0,
    };

    const onWindowMouseMove = (moveEvt: MouseEvent) => {
      const session = dragSessionRef.current;
      if (!session.active) return;
      const dy = moveEvt.clientY - session.startY;
      if (!session.dragging && Math.abs(dy) > 6) {
        session.dragging = true;
        setIsDragging(true);
      }
      if (session.dragging) {
        if (Math.abs(dy) > 10) {
          suppressClickRef.current = true;
        }
        session.currentY = dy;
        setDragOffsetY(dy);
      }
    };

    const onWindowMouseUp = () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      const session = dragSessionRef.current;
      if (!session.active) return;
      const wasDragging = session.dragging;
      const deltaY = session.currentY;
      const startTime = session.startTime;
      session.active = false;
      session.dragging = false;

      if (wasDragging) {
        finishDrag(deltaY, startTime);
      } else {
        setIsDragging(false);
        setDragOffsetY(0);
        suppressClickRef.current = false;
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      triggerNext();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      triggerPrev();
    }
  };

  const badgeTone =
    accentColor === 'cyan'
      ? 'bg-cyan-950/85 border-cyan-400/40 text-cyan-200'
      : 'bg-emerald-950/85 border-emerald-400/40 text-emerald-200';
  const arrowTone =
    accentColor === 'cyan'
      ? 'hover:border-cyan-400/60 hover:text-cyan-200'
      : 'hover:border-emerald-400/60 hover:text-emerald-200';
  const cardEdgeBorder =
    accentColor === 'cyan' ? 'border-cyan-500/35' : 'border-emerald-500/35';

  const renderDeckHeader = () => {
    if (!deckTitle && !hasMultiple) return null;
    return (
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          {deckTitle && (
            <h3 className="no-mobile-clamp text-xs sm:text-sm font-extrabold text-stone-100 tracking-tight truncate">
              {deckTitle}
            </h3>
          )}
          {deckSubtitle && (
            <p className="no-mobile-clamp text-[10.5px] text-stone-400 truncate">
              {deckSubtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <span
            className={`no-mobile-clamp px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold tabular-nums select-none ${badgeTone}`}
          >
            {isLoading ? '…' : `${activeIndex + 1} / ${count}`}
          </span>

          {showNavArrows && hasMultiple && !isLoading && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerPrev();
                }}
                aria-label="Previous card"
                className={`w-7 h-7 rounded-full bg-stone-900/95 border border-white/15 text-stone-200 ${arrowTone} flex items-center justify-center cursor-pointer active:scale-90 transition-all shadow-sm`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerNext();
                }}
                aria-label="Next card"
                className={`w-7 h-7 rounded-full bg-stone-900/95 border border-white/15 text-stone-200 ${arrowTone} flex items-center justify-center cursor-pointer active:scale-90 transition-all shadow-sm`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`relative w-full ${className}`} aria-busy="true" aria-live="polite">
        {renderDeckHeader()}
        <div className="relative pb-6">
          {/* Depth stack preview under skeleton */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 ${heightClassName} rounded-2xl bg-stone-900/80 border ${cardEdgeBorder}`}
            style={{ transform: 'translateY(10px) scale(0.96)', opacity: 0.7, zIndex: 20 }}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 ${heightClassName} rounded-2xl bg-stone-950/75 border border-white/10`}
            style={{ transform: 'translateY(20px) scale(0.92)', opacity: 0.45, zIndex: 10 }}
          />
          <div className={`relative z-30 w-full ${heightClassName} rounded-2xl overflow-hidden`}>
            {skeleton || (
              <div className="h-full w-full rounded-2xl p-4 bg-stone-900/95 border border-white/10 flex flex-col justify-between">
                <div className="h-36 w-full rounded-xl skeleton-shimmer" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 rounded-lg skeleton-shimmer" />
                  <div className="h-3 w-4/5 rounded-md skeleton-shimmer" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="h-4 w-24 rounded-md skeleton-shimmer" />
                  <div className="h-9 w-28 rounded-xl skeleton-shimmer" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return <>{emptyState}</>;
  }

  // Upward drag progress (0 -> 1 as card moves up toward 140px or exits up)
  const upProgress =
    flyState === 'exit-up'
      ? 1
      : isDragging && dragOffsetY < 0
      ? Math.min(1, Math.abs(dragOffsetY) / 140)
      : 0;

  // Downward drag progress (0 -> 1 as previous card is pulled down)
  const downProgress =
    flyState === 'enter-down'
      ? 1
      : isDragging && dragOffsetY > 0
      ? Math.min(1, dragOffsetY / 140)
      : 0;

  const isPullingPrev = (isDragging && dragOffsetY > 0) || flyState === 'enter-down';
  const prevIdx = (activeIndex - 1 + count) % count;

  // Build visible stack layers (front card + up to 3 upcoming cards behind)
  const visibleDepth = Math.min(count, 4);
  const stackOffsets = Array.from({ length: visibleDepth }, (_, i) => i);

  // If exactly 2 items, add a subtle 3rd depth backing plate so 3D deck always feels layered
  const showSyntheticThirdPlate = count === 2;

  const cardTransition = isDragging
    ? 'none'
    : 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out';

  return (
    <div className={`relative w-full ${className}`}>
      {renderDeckHeader()}

      {/* 3D Vertical Stacked Card Deck Container (Critical Scroll Lock: touch-action: none) */}
      <div
        ref={deckRef}
        tabIndex={hasMultiple ? 0 : undefined}
        role="region"
        aria-roledescription="carousel"
        aria-label={deckTitle || 'Card stack'}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        className={`relative w-full pb-7 select-none touch-none focus:outline-none ${
          hasMultiple ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={{
          touchAction: 'none',
          clipPath: 'inset(-2px -12px -4px -12px)',
        }}
      >
        <div className={`relative w-full ${heightClassName}`}>
          {/* Synthetic 3rd depth layer when only 2 items exist */}
          {showSyntheticThirdPlate && (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-2xl bg-stone-950/90 border border-white/10 shadow-xl`}
              style={{
                zIndex: 10,
                transform: `translateY(${(20 - 10 * upProgress + 6 * downProgress).toFixed(2)}px) scale(${(
                  0.92 +
                  0.04 * upProgress -
                  0.02 * downProgress
                ).toFixed(4)})`,
                opacity: 0.72,
                transition: cardTransition,
              }}
            />
          )}

          {/* Render back-to-front upcoming cards + active front card */}
          {stackOffsets
            .slice()
            .reverse()
            .map((offset) => {
              const itemIdx = (activeIndex + offset) % count;
              const item = items[itemIdx];
              const itemKey = `${keyExtractor(item, itemIdx)}-slot-${offset}`;

              let zIndex = 30;
              let translateYExpr = '0px';
              let rotateDeg = 0;
              let scale = 1;
              let opacity = 1;

              if (offset === 0) {
                zIndex = 30;
                if (flyState === 'exit-up') {
                  translateYExpr = '-115%';
                  rotateDeg = -3.5;
                  opacity = 0;
                } else if (isDragging && dragOffsetY < 0) {
                  const dampedY =
                    dragOffsetY < -180
                      ? -180 + (dragOffsetY + 180) * 0.35
                      : dragOffsetY;
                  translateYExpr = `${dampedY}px`;
                  rotateDeg = Math.max(-5, dampedY * 0.015);
                  opacity = Math.max(0.25, 1 - Math.abs(dampedY) / 420);
                } else if (isPullingPrev) {
                  translateYExpr = `${(10 * downProgress).toFixed(2)}px`;
                  scale = 1 - 0.04 * downProgress;
                  opacity = 1 - 0.1 * downProgress;
                }
              } else if (offset === 1) {
                zIndex = 20;
                const y = 10 - 10 * upProgress + 10 * downProgress;
                scale = 0.96 + 0.04 * upProgress - 0.04 * downProgress;
                opacity = 0.92 + 0.08 * upProgress - 0.12 * downProgress;
                translateYExpr = `${y.toFixed(2)}px`;
              } else if (offset === 2) {
                zIndex = 10;
                const y = 20 - 10 * upProgress + 8 * downProgress;
                scale = 0.92 + 0.04 * upProgress - 0.04 * downProgress;
                opacity = 0.82 + 0.1 * upProgress - 0.17 * downProgress;
                translateYExpr = `${y.toFixed(2)}px`;
              } else {
                zIndex = 5;
                const y = 28 - 8 * upProgress;
                scale = 0.88 + 0.04 * upProgress;
                opacity = 0.65 + 0.17 * upProgress - 0.25 * downProgress;
                translateYExpr = `${y.toFixed(2)}px`;
              }

              const isFront = offset === 0;

              return (
                <div
                  key={itemKey}
                  aria-hidden={!isFront}
                  className={`absolute inset-0 rounded-2xl overflow-hidden will-change-transform ${
                    isFront ? 'pointer-events-auto shadow-2xl' : 'pointer-events-none shadow-lg'
                  }`}
                  style={{
                    zIndex,
                    transform: `translate3d(0, ${translateYExpr}, 0) scale(${scale.toFixed(4)}) rotate(${rotateDeg.toFixed(2)}deg)`,
                    opacity: Math.max(0, Math.min(1, Number(opacity.toFixed(3)))),
                    transition: cardTransition,
                  }}
                >
                  {renderItem(item, itemIdx, isFront)}
                  {!isFront && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-stone-950/25 rounded-2xl"
                    />
                  )}
                </div>
              );
            })}

          {/* Incoming Previous Card Sliding Back Down On Top (Swipe Down / Prev Button) */}
          {hasMultiple && isPullingPrev && (
            <div
              key={`${keyExtractor(items[prevIdx], prevIdx)}-slot-prev`}
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl pointer-events-none will-change-transform"
              style={{
                zIndex: 40,
                transform:
                  flyState === 'enter-down'
                    ? 'translate3d(0, 0px, 0) scale(1) rotate(0deg)'
                    : `translate3d(0, ${Math.min(
                        0,
                        -deckHeight + dragOffsetY * 1.1
                      ).toFixed(2)}px, 0) rotate(${Math.min(
                        2.5,
                        dragOffsetY * 0.01
                      ).toFixed(2)}deg)`,
                opacity:
                  flyState === 'enter-down'
                    ? 1
                    : Math.min(1, 0.45 + dragOffsetY / 160),
                transition: cardTransition,
              }}
            >
              {renderItem(items[prevIdx], prevIdx, false)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
