import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Mountain, Sparkles, Compass, Camera } from 'lucide-react';
import { GalleryItem, Place, Township } from '../types';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';

interface GalleryCarouselProps {
  items: GalleryItem[];
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

export const GalleryCarousel: React.FC<GalleryCarouselProps> = ({ items, onSelectPlace }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Touch and drag swipe state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const minSwipeThreshold = 40; // minimum pixels to trigger next/prev slide

  const nextSlide = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  const prevSlide = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setSwipeOffset(0);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    // Disambiguate: only capture if horizontal intent is greater than vertical scroll
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setSwipeOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null) return;
    if (swipeOffset > minSwipeThreshold) {
      prevSlide();
    } else if (swipeOffset < -minSwipeThreshold) {
      nextSlide();
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  // Mouse handlers for desktop/trackpad drag emulation
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStartX(e.clientX);
    setIsMouseDown(true);
    setSwipeOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || mouseStartX === null) return;
    setSwipeOffset(e.clientX - mouseStartX);
  };

  const handleMouseUp = () => {
    if (!isMouseDown || mouseStartX === null) return;
    if (swipeOffset > minSwipeThreshold) {
      prevSlide();
    } else if (swipeOffset < -minSwipeThreshold) {
      nextSlide();
    }
    setMouseStartX(null);
    setIsMouseDown(false);
    setSwipeOffset(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleViewDetails = (item: GalleryItem) => {
    // Replicate GsapLoopGallery modal behavior
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
      <div className="w-full max-w-7xl mx-auto rounded-3xl p-8 sm:p-12 text-center bg-stone-900/60 border border-white/5 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-heading font-bold text-stone-100">
            Interactive Highland Spotlight Gallery
          </h3>
          <p className="text-xs sm:text-sm text-stone-400">
            No gallery spotlights have been published yet. Curators and admins can add high-elevation photography, locations, and descriptions via the Admin Control Room.
          </p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Highland Horizons</span>
          </div>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-heading font-extrabold text-stone-100 leading-tight">
            Visual Highlights &amp; Highland Horizons
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile touch swipe hint badge */}
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-full sm:hidden">
            <span className="animate-pulse">↔</span>
            <span>Swipe</span>
          </div>
          <div className="text-xs text-stone-400 font-mono hidden sm:block">
            {currentIndex + 1} / {items.length} Spotlights
          </div>
        </div>
      </div>

      {/* Adaptive Card: Expands naturally to description length on mobile & desktop */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: isSwiping || isMouseDown ? `translateX(${swipeOffset * 0.45}px)` : 'translateX(0px)',
          transition: isSwiping || isMouseDown ? 'none' : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="bg-stone-900/95 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row w-full md:min-h-[380px] select-none touch-pan-y cursor-grab active:cursor-grabbing transition-colors relative"
      >
        {/* Responsive Image Box */}
        <div className="w-full md:w-1/2 h-44 sm:h-60 md:h-auto md:min-h-[380px] relative overflow-hidden bg-stone-950 shrink-0">
          <img
            src={safeSrc(currentItem.imageUrl, DEFAULT_PLACE_IMAGE)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-30 pointer-events-none"
          />

          <img
            src={safeSrc(currentItem.imageUrl, DEFAULT_PLACE_IMAGE)}
            alt={currentItem.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_PLACE_IMAGE;
            }}
            className="relative z-10 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent md:hidden" />
          {currentItem.elevation && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] sm:text-[11px] font-mono text-emerald-400 border border-white/10 shadow-lg">
              <Mountain className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{currentItem.elevation} ASL</span>
            </div>
          )}
        </div>

        {/* Adaptive Text Content Panel */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 flex flex-col justify-between gap-3 sm:gap-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                {currentItem.category || 'Highlands'}
              </span>
              <span className="text-[11px] sm:text-xs text-stone-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-400 shrink-0" />
                <span>{currentItem.township}</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-2xl md:text-3xl font-heading font-bold text-stone-100 leading-snug break-words">
              {currentItem.title}
            </h3>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words">
              {currentItem.description}
            </p>
          </div>

          {/* Pinned Bottom Metadata & Action Bar */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-mono text-stone-400">
              {currentIndex + 1} of {items.length} Spotlights
            </span>
            {onSelectPlace && (
              <button
                onClick={() => handleViewDetails(currentItem)}
                className="px-3 py-1.5 sm:px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore on Map</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-1">
        <button
          onClick={prevSlide}
          className="p-2 sm:p-2.5 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
          aria-label="Previous Spotlight"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-8 sm:w-10 bg-emerald-500' : 'w-2 bg-stone-700 hover:bg-stone-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="p-2 sm:p-2.5 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
          aria-label="Next Spotlight"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};
