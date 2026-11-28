import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Mountain, Compass, Camera } from 'lucide-react';
import { GalleryItem, Language, Place } from '../types';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';

interface GalleryCarouselProps {
  items: GalleryItem[];
  language?: Language;
  onSelectPlace?: (place: Place) => void;
}

const TOWNSHIP_COORDS: Record<string, { lat: number; lng: number }> = {
  'Tanah Rata': { lat: 4.4715, lng: 101.3805 },
  'Brinchang': { lat: 4.4905, lng: 101.3892 },
  'Kea Farm': { lat: 4.5078, lng: 101.4088 },
  'Ringlet': { lat: 4.4128, lng: 101.3812 },
  'Kampung Raja': { lat: 4.5668, lng: 101.4112 },
  'Tringkap': { lat: 4.5122, lng: 101.4215 },
  'Kuala Terla': { lat: 4.5422, lng: 101.4182 },
  'Bertam Valley': { lat: 4.4188, lng: 101.3982 },
};

export const GalleryCarousel: React.FC<GalleryCarouselProps> = ({
  items,
  language = 'en',
  onSelectPlace,
}) => {
  const isBm = language === 'bm';
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const scrollToIndex = useCallback(
    (idx: number) => {
      const track = trackRef.current;
      if (!track || items.length === 0) return;
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const cardEl = track.children[clamped] as HTMLElement | undefined;
      if (cardEl) {
        track.scrollTo({
          left: cardEl.offsetLeft - track.offsetLeft,
          behavior: 'smooth',
        });
      }
      setCurrentIndex(clamped);
    },
    [items.length]
  );

  const nextSlide = useCallback(() => {
    if (items.length === 0) return;
    const next = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(next);
  }, [currentIndex, items.length, scrollToIndex]);

  const prevSlide = useCallback(() => {
    if (items.length === 0) return;
    const prev = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    scrollToIndex(prev);
  }, [currentIndex, items.length, scrollToIndex]);

  // Track active dot as user natively swipes or scrolls horizontally
  const handleTrackScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;
    const children = Array.from(track.children) as HTMLElement[];
    if (children.length === 0) return;

    const scrollCenter = track.scrollLeft + track.clientWidth * 0.35;
    let closestIdx = 0;
    let minDist = Infinity;

    children.forEach((child, idx) => {
      const childStart = child.offsetLeft - track.offsetLeft;
      const dist = Math.abs(childStart - scrollCenter + track.clientWidth * 0.25);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    setCurrentIndex(closestIdx);
  }, [items.length]);

  // Desktop mouse drag-to-slide support
  const handleMouseDown = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX;
    scrollStartLeftRef.current = track.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!isDraggingRef.current || !track) return;
    const delta = e.pageX - dragStartXRef.current;
    if (Math.abs(delta) > 5) {
      hasDraggedRef.current = true;
    }
    track.scrollLeft = scrollStartLeftRef.current - delta;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  const handleViewDetails = (item: GalleryItem) => {
    if (hasDraggedRef.current) return;
    const coords = TOWNSHIP_COORDS[item.township] || { lat: 4.475, lng: 101.385 };
    const galleryPlace: Place = {
      id: `gal-place-${item.id}`,
      name: item.title,
      nameBm: item.titleBm || item.title,
      category: 'attraction',
      subCategory: 'agrotourism_farms',
      township: item.township,
      description: item.description,
      descriptionBm: item.descriptionBm || item.description,
      location: `${item.township}, Cameron Highlands, Pahang`,
      contact: '',
      coordinates: coords,
      elevation: item.elevation || '1,560 m',
      rating: 4.9,
      reviewsCount: 24,
      tags: [item.category, item.township, 'Featured Lens'],
      imageUrl: item.imageUrl,
      operatingHours: { from: '08:30', to: '18:00', isOpen: true, isOpen24Hours: false },
      trafficStatus: 'smooth',
    };
    onSelectPlace?.(galleryPlace);
  };

  if (items.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto rounded-3xl p-8 sm:p-12 text-center bg-stone-900/60 border border-white/10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-heading font-bold text-stone-100">
            {isBm ? 'Galeri Foto & Acara Tanah Tinggi' : 'Highland Events / Photo Gallery'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400">
            {isBm
              ? 'Tiada sorotan galeri diterbitkan lagi.'
              : 'No gallery spotlights have been published yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{isBm ? 'Sorotan Tanah Tinggi' : 'Highland Horizons'}</span>
          </div>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-heading font-extrabold text-stone-100 leading-tight">
            {isBm ? 'Acara & Galeri Foto Tanah Tinggi' : 'Highland Events / Photo Gallery'}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <span className="animate-pulse">↔</span>
            <span>{isBm ? 'Leret' : 'Slide'}</span>
          </div>
          <div className="text-xs text-stone-400 font-mono hidden sm:block tabular-nums">
            {currentIndex + 1} / {items.length}
          </div>
        </div>
      </div>

      {/* Direct Horizontal Carousel Track (Immediately Slide Left/Right Without Clicking) */}
      <div className="relative group/carousel">
        <div
          ref={trackRef}
          onScroll={handleTrackScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x cursor-grab active:cursor-grabbing select-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((item) => {
            const title = isBm ? item.titleBm || item.title : item.title;
            const desc = isBm ? item.descriptionBm || item.description : item.description;
            return (
              <article
                key={item.id}
                className="w-[86%] sm:w-[76%] md:w-[48%] lg:w-[46%] shrink-0 snap-start bg-stone-900/95 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 hover:border-emerald-500/40 flex flex-col transition-colors"
              >
                {/* Image Header */}
                <div className="w-full h-44 sm:h-56 relative overflow-hidden bg-stone-950 shrink-0">
                  <img
                    src={safeSrc(item.imageUrl, DEFAULT_PLACE_IMAGE)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-30 pointer-events-none"
                  />
                  <img
                    src={safeSrc(item.imageUrl, DEFAULT_PLACE_IMAGE)}
                    alt={title}
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_PLACE_IMAGE;
                    }}
                    className="relative z-10 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-stone-950/85 via-transparent to-transparent" />
                  {item.elevation && (
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] sm:text-[11px] font-mono text-emerald-400 border border-white/10 shadow-lg">
                      <Mountain className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>{item.elevation} ASL</span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-3 right-3 z-20 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      {item.category || 'Highlands'}
                    </span>
                    <span className="text-[11px] text-stone-200 flex items-center gap-1 font-medium drop-shadow">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{item.township}</span>
                    </span>
                  </div>
                </div>

                {/* Card Copy & Action */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-heading font-bold text-stone-100 leading-snug line-clamp-1">
                      {title}
                    </h3>
                    <p className="text-stone-300 text-xs sm:text-sm leading-relaxed line-clamp-2">
                      {desc}
                    </p>
                  </div>

                  {onSelectPlace && (
                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 hover:text-white border border-emerald-500/35 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{isBm ? 'Teroka di Peta' : 'Explore on Map'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Pagination & Prev/Next Controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-0.5">
        <button
          type="button"
          onClick={prevSlide}
          className="p-2 sm:p-2.5 rounded-full bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 border border-white/10 transition-colors cursor-pointer"
          aria-label="Previous Spotlight"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex
                  ? 'w-7 sm:w-9 bg-emerald-500'
                  : 'w-2 bg-stone-700 hover:bg-stone-600'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={nextSlide}
          className="p-2 sm:p-2.5 rounded-full bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 border border-white/10 transition-colors cursor-pointer"
          aria-label="Next Spotlight"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
