import React, { useState, useEffect, useRef } from 'react';
import {
  CloudSun,
  Sun,
  Car,
  ShieldAlert,
  Calendar,
  Compass,
  Layers,
  X,
  MapPin,
  Sparkles,
  Info,
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Language } from '../types';
import { firebaseService } from '../services/firebase';

export interface GsapLoopGalleryProps {
  language?: Language;
  onOpenDirectoriesModal?: () => void;
  onOpenPortalsModal?: () => void;
  setActiveCapsuleModal?: (modal: 'microclimate' | 'traffic' | 'hazard' | 'events' | null) => void;
  activeCapsuleModal?: 'microclimate' | 'traffic' | 'hazard' | 'events' | null;
}

export interface GalleryCardData {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  icon: React.ReactNode;
  description: string;
  details: string[];
  index?: number;
}

export const GsapLoopGallery: React.FC<GsapLoopGalleryProps> = ({
  language = 'en',
  onOpenDirectoriesModal,
  onOpenPortalsModal,
  setActiveCapsuleModal,
  activeCapsuleModal,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<GalleryCardData | null>(null);
  const [customImages, setCustomImages] = useState<Record<string, string>>(() => firebaseService.getGsapCardImages());

  const isModalOpen = Boolean(selectedCard || activeCapsuleModal);
  const isBm = language === 'bm';

  useEffect(() => {
    const handleImagesUpdated = () => {
      setCustomImages(firebaseService.getGsapCardImages());
    };
    window.addEventListener('gsap-images-updated', handleImagesUpdated);
    return () => window.removeEventListener('gsap-images-updated', handleImagesUpdated);
  }, []);

  const baseCards = [
    {
      id: 'card-1',
      title: isBm ? 'Mikroiklim' : 'Microclimate',
      subtitle: isBm ? '14°C - 22°C Tanah Tinggi' : '14°C - 22°C Altitude',
      category: isBm ? 'Iklim' : 'Climate',
      imageUrl: customImages['card-1'] || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80', // Highland mist
      icon: (
        <div className="relative flex items-center">
          <CloudSun className="w-6 h-6 text-cyan-400 animate-pulse" />
          <Sun className="absolute -right-2 -bottom-2 w-3.5 h-3.5 text-amber-400 animate-spin duration-3000" />
        </div>
      ),
      description: isBm
        ? 'Iklim tanah tinggi tropika sejuk antara 14°C hingga 22°C dengan kabut pagi yang menyegarkan, telemetri langsung, dan udara gunung bersih pada ketinggian 1,440m - 2,032m.'
        : 'Chilly tropical highland climate ranging from 14°C to 22°C with refreshing morning mists, live telemetry, and clean mountain air at 1,440m - 2,032m elevation.',
      details: isBm
        ? [
            'Ketinggian: 1,440m hingga 2,032m dari aras laut',
            'Suhu purata tahunan: 18°C dengan ikon cuaca animasi',
            'Kabus gunung pagi dan angin sepoi tanah tinggi petang',
            'Kondisi ideal untuk penanaman teh dan flora iklim sederhana'
          ]
        : [
            'Elevation range: 1,440m to 2,032m above sea level',
            'Average annual temperature: 18°C with animated weather icons',
            'Frequent morning mountain fog and afternoon highland breezes',
            'Ideal conditions for tea cultivation and temperate flora'
          ]
    },
    {
      id: 'card-2',
      title: isBm ? 'Pusat Trafik' : 'Traffic Hub',
      subtitle: isBm ? 'Laluan 59 & 185 Langsung' : 'Route 59 & 185 Live',
      category: isBm ? 'Transit' : 'Transit',
      imageUrl: customImages['card-2'] || 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80', // Winding mountain road
      icon: <Car className="w-6 h-6 text-amber-400" />,
      description: isBm
        ? 'Pemantauan masa nyata Laluan Persekutuan 59 (Tapah / Simpang Pulai) dan jalan utama tanah tinggi untuk kelancaran percutian.'
        : 'Real-time monitoring of Federal Route 59 (Tapah / Simpang Pulai) and major highland arterial roads for smooth holiday transit.',
      details: isBm
        ? [
            'Kemas kini kesesakan langsung untuk laluan Ringlet dan Brinchang',
            'Notis keselamatan cerun dan penyelenggaraan JKR',
            'Laluan alternatif disyorkan semasa waktu puncak hujung minggu',
            'Panggilan tunda kecemasan 4X4 dan bantuan kerosakan'
          ]
        : [
            'Live congestion updates for Ringlet and Brinchang stretch',
            'JKR slope safety and maintenance notices',
            'Recommended alternative bypass routes during peak weekend hours',
            'Emergency 4X4 towing and breakdown contacts'
          ]
    },
    {
      id: 'card-3',
      title: isBm ? 'Amaran Bencana & Cerun' : 'Hazard & Slope Alerts',
      subtitle: isBm ? 'Suapan Rasmi JKR & MDCH' : 'Official JKR & MDCH Feeds',
      category: isBm ? 'Keselamatan' : 'Safety',
      imageUrl: customImages['card-3'] || 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=1200&q=80', // Stormy weather / heavy rain
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
      description: isBm
        ? 'Pemantauan cerun masa nyata Laluan FT059 (Tapah) dan FT185 (Simpang Pulai) oleh JKR Cameron Highlands serta notis perbandaran Majlis Daerah Cameron Highlands (MDCH).'
        : 'Real-time slope and landslide surveillance for FT059 (Tapah) & FT185 (Simpang Pulai) by JKR Cameron Highlands and MDCH municipal safety dispatches.',
      details: isBm
        ? [
            'Suapan masa nyata JKR Cameron Highlands (Portal eBencana & Facebook Rasmi)',
            'Notis keselamatan perbandaran & pasar malam oleh Majlis Daerah Cameron Highlands (MDCH)',
            'Status pembersihan tanah runtuh dan laluan satu lorong terkawal',
            'Talian Bilik Gerakan Bencana JKR (+60 5-491 1040) & Hotline SOS 999'
          ]
        : [
            'Real-time feeds from JKR Cameron Highlands (eBencana Disaster Portal & Official FB)',
            'Municipal safety, market rerouting & fallen trees by Majlis Daerah Cameron Highlands (MDCH)',
            'Landslide clearance progress and controlled one-lane contraflow status',
            'JKR Disaster Room (+60 5-491 1040) & Highland SOS 999 response hotlines'
          ]
    },
    {
      id: 'card-4',
      title: isBm ? 'Acara Tanah Tinggi' : 'Highland Events',
      subtitle: isBm ? 'Pesta & Pasar Malam' : 'Festivals & Night Markets',
      category: isBm ? 'Budaya' : 'Culture',
      imageUrl: customImages['card-4'] || 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=80', // Market/Market stalls
      icon: <Calendar className="w-6 h-6 text-purple-400" />,
      description: isBm
        ? 'Terokai pasar malam hujung minggu yang meriah, pameran pertanian, pesta bunga, dan sambutan budaya tempatan.'
        : 'Explore vibrant weekend night markets, agricultural exhibitions, floral festivals, and traditional highland cultural celebrations.',
      details: isBm
        ? [
            'Pasar Malam Hujung Minggu Golden Hills & Brinchang',
            'Pesta Flora Cameron Highlands Tahunan',
            'Lawatan sambutan penuaian Ladang Teh BOH',
            'Muzik tradisional langsung dan bazar kraf tempatan'
          ]
        : [
            'Golden Hills & Brinchang Weekend Night Markets',
            'Annual Cameron Highlands Flora Festival',
            'BOH Tea Plantation harvest celebration tours',
            'Live traditional music and local artisan bazaars'
          ]
    },
    {
      id: 'card-5',
      title: isBm ? 'Direktori Terkini' : 'Verified Directories',
      subtitle: isBm ? 'Jelajah Cameron Highlands' : 'Explore Cameron Highlands',
      category: isBm ? 'Direktori' : 'Directory',
      imageUrl: customImages['card-5'] || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80', // Map/Town street
      icon: <Compass className="w-6 h-6 text-emerald-400" />,
      description: isBm
        ? 'Senarai disahkan hotel, resort, homestay, restoran stimbot, ladang strawberi, dan rumah teh di seluruh 9 bandar.'
        : 'Curated list of verified hotels, resorts, homestays, steamboat restaurants, strawberry farms, and tea houses across all 9 townships.',
      details: isBm
        ? [
            'Lebih 100+ perniagaan dan kedai makan yang disahkan',
            'Navigasi GPS terus dan waktu operasi',
            'Simpanan penanda buku dan ulasan pelawat eksklusif',
            'Lawatan agropelancongan dan panduan memetik strawberi'
          ]
        : [
            'Over 100+ verified highland businesses and eateries',
            'Direct GPS navigation and operational hours',
            'Exclusive visitor bookmarks and reviews',
            'Agritourism farm tours and strawberry picking guides'
          ]
    },
    {
      id: 'card-6',
      title: isBm ? 'Pusat Portal' : 'Portals Hub',
      subtitle: isBm ? 'Bandar & Pautan Rasmi' : 'Townships & Official Links',
      category: isBm ? 'Portal' : 'Portal',
      imageUrl: customImages['card-6'] || 'https://images.unsplash.com/photo-1577086664693-894d8405334a?auto=format&fit=crop&w=1200&q=80', // Official building/Town hall
      icon: <Layers className="w-6 h-6 text-teal-400" />,
      description: isBm
        ? 'Laluan terus ke 9 bandar utama, permit Majlis Daerah Cameron Highlands (MDCH), notis jalan JKR, dan pentadbiran daerah.'
        : 'Direct gateway to the 9 distinct highland townships, MDCH municipal council permits, JKR road notices, and district administration.',
      details: isBm
        ? [
            'Panduan zon untuk Tanah Rata, Brinchang, Kea Farm, Ringlet & banyak lagi',
            'Pelesenan perniagaan rasmi MDCH dan permit pelancongan',
            'Direktori hospital daerah dan klinik',
            'Iklan jawatan kosong tempatan dan papan komuniti'
          ]
        : [
            'Township guides for Tanah Rata, Brinchang, Kea Farm, Ringlet & more',
            'MDCH official business licensing and tourism permits',
            'District hospital and clinic directories',
            'Local job classifieds and community boards'
          ]
    }
  ];

  const totalCards = 18;
  const cardsList = Array.from({ length: totalCards }, (_, i) => {
    const base = baseCards[i % baseCards.length];
    return {
      ...base,
      uniqueId: `card-item-${i}`,
      index: i,
    };
  });

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleTouchMove = (e: any) => {
    touchEndX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40) {
      setActiveIndex((prev) => (prev + 1) % cardsList.length);
    } else if (diff < -40) {
      setActiveIndex((prev) => (prev - 1 + cardsList.length) % cardsList.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleCardClick = (card: GalleryCardData) => {
    const cardId = card.id || baseCards[(card.index ?? 0) % baseCards.length]?.id;

    if (cardId === 'card-1') {
      if (setActiveCapsuleModal) setActiveCapsuleModal('microclimate');
      else setSelectedCard(card);
    } else if (cardId === 'card-2') {
      if (setActiveCapsuleModal) setActiveCapsuleModal('traffic');
      else setSelectedCard(card);
    } else if (cardId === 'card-3') {
      if (setActiveCapsuleModal) setActiveCapsuleModal('hazard');
      else setSelectedCard(card);
    } else if (cardId === 'card-4') {
      if (setActiveCapsuleModal) setActiveCapsuleModal('events');
      else setSelectedCard(card);
    } else if (cardId === 'card-5' && onOpenDirectoriesModal) {
      onOpenDirectoriesModal();
    } else if (cardId === 'card-6' && onOpenPortalsModal) {
      onOpenPortalsModal();
    } else {
      setSelectedCard(card);
    }
  };

  return (
    <div className="relative w-full py-2 sm:py-8 bg-stone-950 overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 mb-3 sm:mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-2 border border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5 animate-spin duration-3000" />
          <span>{isBm ? 'Galeri Pengalaman Interaktif' : 'Interactive Experience Gallery'}</span>
        </div>
        <h3 className="text-2xl sm:text-4xl font-heading font-black text-stone-100 tracking-tight">
          {isBm ? 'Hab Pengalaman Cameron Highlands' : 'Cameron Highlands Experience Hub'}
        </h3>
        <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mx-auto mt-1 sm:mt-2">
          {isBm
            ? 'Leret secara mendatar dengan jari atau seret tetikus, atau guna butang tindakan untuk meneroka Mikroiklim, Trafik, Amaran Bencana, Acara, Direktori, dan Portal.'
            : 'Swipe horizontally with fingers or mouse drag, or use action buttons to explore Microclimate, Traffic, Hazards, Events, Directories, and Portals.'}
        </p>
      </div>

      <div
        className={`relative w-full h-[52vh] sm:h-[65vh] min-h-[380px] sm:min-h-[440px] flex items-center justify-center overflow-hidden bg-stone-950/80 border-y border-emerald-500/25 select-none cursor-grab active:cursor-grabbing touch-pan-y transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
          isModalOpen
            ? 'scale-[0.82] opacity-15 filter blur-md pointer-events-none grayscale-[40%]'
            : 'scale-100 opacity-100 filter blur-none pointer-events-auto grayscale-0'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleTouchMove(e);
        }}
        onMouseUp={handleTouchEnd}
      >
        <div className="relative w-[15rem] sm:w-[16rem] h-[21rem] sm:h-[22rem]">
          {cardsList.map((card, i) => {
            const offset = (i - activeIndex + cardsList.length) % cardsList.length;
            const absOffset = offset > cardsList.length / 2 ? offset - cardsList.length : offset;
            const isVisible = Math.abs(absOffset) <= 2;

            if (!isVisible) return null;

            const xTranslate = absOffset * 180;
            const scale = absOffset === 0 ? 1 : 0.85;
            const opacity = absOffset === 0 ? 1 : 0.5;
            const zIndex = 100 - Math.abs(absOffset);

            return (
              <div
                key={card.uniqueId}
                onClick={() => {
                  if (absOffset === 0) handleCardClick(card);
                  else setActiveIndex(i);
                }}
                style={{
                  transform: `translateX(${xTranslate}px) scale(${scale})`,
                  opacity: opacity,
                  zIndex: zIndex,
                }}
                className="absolute top-0 left-0 w-[15rem] sm:w-[16rem] h-[21rem] sm:h-[22rem] rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-stone-950 cursor-pointer transition-all duration-500 ease-out flex flex-col justify-end group"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${card.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                
                <div className="relative z-10 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                      {card.category}
                    </span>
                    <div className="p-1.5 rounded-full bg-stone-900/80 backdrop-blur-md text-emerald-400 border border-white/10">
                      {card.icon}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-heading font-black text-stone-100 leading-tight group-hover:text-emerald-300 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-xs text-stone-300 font-medium mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(card);
                    }}
                    className="w-full pt-2 flex items-center justify-between text-[11px] text-emerald-400 font-bold border-t border-white/10 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>{isBm ? 'Klik untuk Butiran & Siaran Langsung' : 'Click for Details & Live Feed'}</span>
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
          <button
            onClick={() => setActiveIndex((prev) => (prev - 1 + cardsList.length) % cardsList.length)}
            className="w-12 h-12 rounded-2xl bg-stone-900/90 hover:bg-emerald-600 text-emerald-400 hover:text-white font-heading text-lg border border-emerald-500/30 shadow-xl flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title={isBm ? "Kad Sebelumnya" : "Previous Card"}
          >
            &#x25C0;
          </button>
          <button
            onClick={() => setActiveIndex((prev) => (prev + 1) % cardsList.length)}
            className="w-12 h-12 rounded-2xl bg-stone-900/90 hover:bg-emerald-600 text-emerald-400 hover:text-white font-heading text-lg border border-emerald-500/30 shadow-xl flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title={isBm ? "Kad Seterusnya" : "Next Card"}
          >
            &#x25B6;
          </button>
        </div>
      </div>

      {/* Modal Popup for Card Info */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-[120] p-2 sm:p-4 overflow-y-auto bg-black/90 backdrop-blur-2xl flex justify-center items-start sm:items-center py-4 sm:py-8"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] my-auto rounded-3xl bg-stone-900/95 border border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.3)] relative backdrop-blur-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Always-visible Sticky Top Header with Close Button */}
            <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-4 bg-stone-900/95 border-b border-white/10 backdrop-blur-md">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                {selectedCard.category}
              </span>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5 text-xs min-h-[44px] min-w-[44px] justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
                <span className="font-mono">{isBm ? 'Tutup' : 'Close'}</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-4">
              <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-white/10 shrink-0">
                <img
                  src={selectedCard.imageUrl}
                  alt={selectedCard.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-100">
                    {selectedCard.title}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">{selectedCard.subtitle}</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {selectedCard.description}
              </p>

              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {isBm ? 'Sorotan Utama & Maklumat' : 'Key Highlights & Insights'}
                </h5>
                <ul className="space-y-2 text-xs text-stone-300">
                  {selectedCard.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-stone-950/60 p-2.5 rounded-xl border border-white/5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                {selectedCard.id === 'card-2' && setActiveCapsuleModal && (
                  <button
                    onClick={() => {
                      setSelectedCard(null);
                      setActiveCapsuleModal('traffic');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Car className="w-4 h-4" />
                    <span>{isBm ? 'Buka Telemetri Trafik Lengkap' : 'Open Live Traffic Telemetry'}</span>
                  </button>
                )}
                {selectedCard.id === 'card-1' && setActiveCapsuleModal && (
                  <button
                    onClick={() => {
                      setSelectedCard(null);
                      setActiveCapsuleModal('microclimate');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>{isBm ? 'Buka Cuaca & Ketinggian' : 'Open Microclimate & Altitude'}</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCard(null)}
                  className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-bold cursor-pointer transition-colors border border-white/10 active:scale-95"
                >
                  {isBm ? 'Tutup Tetingkap' : 'Close Window'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InfiniteLoopGallery = GsapLoopGallery;

export interface InteractiveGalleryProps {
  items?: any[];
  language?: Language;
}

export const InteractiveGallery: React.FC<InteractiveGalleryProps> = ({ items = [], language = 'en' }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const defaultItems = items.length > 0 ? items : [
    {
      id: 'item-1',
      title: 'BOH Sungei Palas Tea Plantation',
      titleBm: 'Ladang Teh BOH Sungei Palas',
      category: 'Plantation',
      township: 'Brinchang',
      elevation: '1,800m',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      description: 'Iconic panoramic tea estate overlooking lush rolling green valleys with a state-of-the-art cantilevered tea café.',
      descriptionBm: 'Ladang teh ikonik yang menawarkan pemandangan lembah hijau yang indah beserta kafe teh terapung berhentian moden.'
    },
    {
      id: 'item-2',
      title: 'Mossy Forest Boardwalk',
      titleBm: 'Laluan Berjalan Kaki Mossy Forest',
      category: 'Nature',
      elevation: '2,032m',
      township: 'Mount Brinchang',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      description: 'Ancient cloud forest draped in prehistoric moss, ferns, and orchids near the peak of Gunung Brinchang.',
      descriptionBm: 'Hutan awan purba yang dilitupi lumut prasejarah, paku-pakis, dan orkid berdekatan puncak Gunung Brinchang.'
    },
    {
      id: 'item-3',
      title: 'Lavender & Strawberry Farm',
      titleBm: 'Ladang Lavender & Strawberi',
      category: 'Agritourism',
      elevation: '1,550m',
      township: 'Tringkap',
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80',
      description: 'Vibrant terraced flower gardens featuring fresh strawberry picking and handmade lavender ice cream.',
      descriptionBm: 'Taman bunga teres yang indah menampilkan aktiviti memetik strawberi segar dan ais krim lavender buatan tangan.'
    }
  ];

  const categories = ['all', 'Plantation', 'Nature', 'Food', 'Agritourism', 'Architecture'];

  const categoryTranslations: Record<string, string> = {
    all: language === 'bm' ? 'semua' : 'all',
    Plantation: language === 'bm' ? 'Ladang' : 'Plantation',
    Nature: language === 'bm' ? 'Alam Semulajadi' : 'Nature',
    Food: language === 'bm' ? 'Makanan' : 'Food',
    Agritourism: language === 'bm' ? 'Agropelancongan' : 'Agritourism',
    Architecture: language === 'bm' ? 'Seni Bina' : 'Architecture',
  };

  const filteredItems = defaultItems.filter((item) => {
    if (filter === 'all') return true;
    return item.category.toLowerCase() === filter.toLowerCase();
  });

  const activeItem = selectedIndex !== null ? filteredItems[selectedIndex] : null;

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0));
  };

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
  };

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.targetTouches ? e.targetTouches[0].clientX : e.clientX;
  };

  const handleTouchMove = (e: any) => {
    touchEndX.current = e.targetTouches ? e.targetTouches[0].clientX : e.clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 font-sans bg-stone-950 text-stone-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {language === 'bm' ? 'GALERI INTERAKTIF' : 'INTERACTIVE LIGHTBOX & SPOTLIGHT'}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-100 tracking-tight mt-1">
            {language === 'bm' ? 'Sorotan Visual & Pemandangan Tanah Tinggi' : 'Visual Highlights & Highland Horizons'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400">
            {language === 'bm'
              ? 'Terokai keindahan pemandangan tanah tinggi dengan isyarat leretan skrin sentuh.'
              : 'Explore breathtaking highland scenery with swipe-enabled mobile touch gestures.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-stone-900 border border-white/10 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3.5 py-2.5 rounded-xl font-semibold capitalize transition-all cursor-pointer min-h-[44px] flex items-center justify-center active:scale-95 ${
                  filter === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {categoryTranslations[cat] || cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {filteredItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-stone-900 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-lg"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-emerald-400 border border-white/10">
                {item.elevation}
              </span>
            </div>

            <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
              <span className="text-[10px] text-stone-400 block truncate">
                {item.township}
              </span>
              <h5 className="text-xs font-bold text-stone-100 truncate group-hover:text-emerald-300 transition-colors">
                {language === 'bm' ? item.titleBm || item.title : item.title}
              </h5>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-950/60 backdrop-blur-[4px] pointer-events-none">
              <span className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xl">
                {language === 'bm' ? 'Lihat Sorotan' : 'View Spotlight'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {activeItem && (
        <div
          className="fixed inset-0 z-[120] p-2 sm:p-4 overflow-y-auto bg-stone-950/95 backdrop-blur-2xl flex justify-center items-start sm:items-center py-4 sm:py-8"
          onClick={() => setSelectedIndex(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-stone-900 rounded-3xl p-4 sm:p-6 border border-emerald-500/30 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Always-Visible Sticky Top Header with Close Button */}
            <div className="sticky top-0 z-30 flex items-center justify-between pb-3 mb-3 border-b border-white/10 bg-stone-900/95 backdrop-blur-md">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {language === 'bm'
                    ? 'Leret kiri/kanan atau guna anak panah untuk navigasi'
                    : 'Swipe left/right or use arrows to navigate'}
                </span>
              </span>
              <button
                onClick={() => setSelectedIndex(null)}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5 text-xs min-h-[44px] min-w-[44px] justify-center"
                aria-label="Close spotlight"
              >
                <X className="w-5 h-5" />
                <span className="font-mono">{language === 'bm' ? 'Tutup' : 'Close'}</span>
              </button>
            </div>

            {/* Scrollable Modal Content Body */}
            <div className="flex-1 overflow-y-auto touch-pan-y space-y-4">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/2 h-60 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-stone-950 relative border border-white/10 shrink-0">
                  <img
                    src={activeItem.imageUrl}
                    alt={activeItem.title}
                    className="w-full h-full object-cover"
                  />
                  <button 
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-900/80 text-white hover:bg-emerald-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-900/80 text-white hover:bg-emerald-600 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {language === 'bm' ? activeItem.titleBm || activeItem.title : activeItem.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">
                      {categoryTranslations[activeItem.category] || activeItem.category}
                    </span>
                    <span className="text-xs font-mono text-stone-300 bg-stone-800 px-2 py-0.5 rounded">
                      {activeItem.elevation}
                    </span>
                    <span className="text-xs font-bold text-emerald-300">{activeItem.township}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {language === 'bm' ? activeItem.descriptionBm || activeItem.description : activeItem.description}
                  </p>
                  <div className="pt-2 text-xs text-stone-400 italic">
                    {language === 'bm'
                      ? '💡 Tip: Pada skrin sentuh, leret ke kiri atau kanan pada kad ini untuk meneroka tempat lain.'
                      : '💡 Tip: On touchscreens, swipe left or right on this card to explore other highland horizons.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function HighlandInteractiveGalleryHub() {
  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <InfiniteLoopGallery />
      <InteractiveGallery />
    </div>
  );
}