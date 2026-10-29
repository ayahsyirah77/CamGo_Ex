import React, { useState, useEffect, useRef } from 'react';
import { GalleryItem, Language } from '../types';
import { getTranslation } from '../services/i18n';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Camera,
  MapPin,
  Mountain,
  Plus,
} from 'lucide-react';

interface InteractiveGalleryProps {
  items: GalleryItem[];
  language: Language;
}

export const InteractiveGallery: React.FC<InteractiveGalleryProps> = ({
  items,
  language,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filter, setFilter] = useState<string>('all');

  // Swipe gesture touch coordinates
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const categories = ['all', 'Agricultural', 'Nature', 'Food & Culture', 'Agritourism', 'Architecture', 'Attractions', 'Scenic Escapes', 'Under the Sun', 'Shopping'];

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.category.toLowerCase() === filter.toLowerCase();
  });

  const activeItem = selectedIndex !== null ? filteredItems[selectedIndex] : null;

  // Keyboard navigation & Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredItems.length]);

  const handleClose = () => {
    setSelectedIndex(null);
    setZoomLevel(1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => ((prev! + 1) % filteredItems.length));
    setZoomLevel(1);
  };

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => ((prev! - 1 + filteredItems.length) % filteredItems.length));
    setZoomLevel(1);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.35, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.35, 0.7));
  const handleZoomReset = () => setZoomLevel(1);

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext(); // Swiped left -> next
    } else if (diff < -50) {
      handlePrev(); // Swiped right -> prev
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="space-y-6">
      {/* Gallery Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {language === 'bm' ? 'GALERI INTERAKTIF' : 'INTERACTIVE LIGHTBOX'}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-100 tracking-tight mt-1">
            {getTranslation(language, 'gallery_title')}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400">
            {getTranslation(language, 'gallery_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-stone-900/90 border border-white/10 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all cursor-pointer ${
                  filter === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Responsive Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {filteredItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => {
              setSelectedIndex(idx);
              setZoomLevel(1);
            }}
            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-stone-900 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-lg hover:shadow-emerald-950/40"
          >
            <img
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.title}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80';
              }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

            {/* Elevation Tag */}
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-emerald-400 border border-white/10">
                {item.elevation}
              </span>
            </div>

            {/* Thumbnail Bottom Info */}
            <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
              <span className="text-[10px] text-stone-400 block truncate">
                {item.township}
              </span>
              <h5 className="text-xs font-bold text-stone-100 truncate group-hover:text-emerald-300 transition-colors">
                {language === 'bm' ? item.titleBm || item.title : item.title}
              </h5>
            </div>

            {/* Hover Expand Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-950/60 backdrop-blur-[4px] pointer-events-none">
              <button 
                className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xl pointer-events-auto cursor-pointer hover:bg-emerald-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(idx);
                }}
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Focused Modal Details Viewer */}
      {activeItem && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-stone-950/95 backdrop-blur-2xl p-2 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div 
            className="relative w-full max-w-4xl mt-16 mb-20 pb-28 overflow-y-auto bg-stone-900 rounded-3xl p-6 border border-emerald-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Close Bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
              <span className="text-xs font-mono font-bold text-emerald-400">Interactive Gallery Spotlight</span>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/2 h-72 md:h-80 rounded-2xl overflow-hidden bg-stone-950 shrink-0 border border-white/10">
                  <img
                    src={activeItem.imageUrl}
                    alt={activeItem.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-4 w-full">
                    <h2 className="text-2xl font-bold text-white">{language === 'bm' ? activeItem.titleBm || activeItem.title : activeItem.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">{activeItem.category}</span>
                        <span className="text-xs font-mono text-stone-300 bg-stone-800 px-2 py-0.5 rounded">{activeItem.elevation}</span>
                        <span className="text-xs font-bold text-emerald-300">{activeItem.township}</span>
                    </div>
                    <p className="text-sm text-stone-300 leading-relaxed">{activeItem.description}</p>
                    <button onClick={handleClose} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg">
                        <MapPin className="w-4 h-4" /> Return to Gallery
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
