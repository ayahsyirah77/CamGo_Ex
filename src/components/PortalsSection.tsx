import React, { useState, useEffect } from 'react';
import { Township, Language, JobClassified, TownshipHubInfo } from '../types';
import { TOWNSHIP_PORTALS, OFFICIAL_PORTALS } from '../data/initialData';
import { firebaseService } from '../services/firebase';
import { getTranslation } from '../services/i18n';
import {
  Layers,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink,
  Phone,
  Compass,
  ArrowRight,
  Send,
  CheckCircle,
  Plus,
  Stethoscope,
  ShieldAlert,
  Fuel,
  Info,
  X,
  Search,
  Store,
} from 'lucide-react';

interface PortalsSectionProps {
  language: Language;
  onExploreTownOnMap: (township: Township) => void;
  onOpenFarmMatrix: () => void;
  onOpenVendorPortal?: () => void;
}

export const PortalsSection: React.FC<PortalsSectionProps> = ({
  language,
  onExploreTownOnMap,
  onOpenFarmMatrix,
  onOpenVendorPortal,
}) => {
  const [activeTab, setActiveTab] = useState<'townships' | 'official'>('townships');
  
  // Township Modal Popup state
  const [selectedTownModal, setSelectedTownModal] = useState<any | null>(null);

  const hubs = firebaseService.getTownshipHubs();

  return (
    <div className="space-y-6" id="portals-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {language === 'bm' ? 'PORTAL & KOMUNITI' : 'HIGHLANDS PORTAL HUB'}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-100 tracking-tight mt-1">
            {language === 'bm' ? 'Pusat Info & Perkhidmatan Rasmi' : 'Highland Townships & Official Links'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400">
            {language === 'bm'
              ? 'Terokai pekan-pekan tanah tinggi dan pautan agensi kerajaan.'
              : 'Discover highlands townships, municipal authorities, and emergency contacts.'}
          </p>

        </div>

        {/* 2 Main Portal Tabs */}
        <div className="w-full sm:w-auto grid grid-cols-2 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-stone-900/90 border border-white/10 text-center">
          <button
            onClick={() => setActiveTab('townships')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap min-w-0 ${
              activeTab === 'townships'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
              1. {language === 'bm' ? 'Pekan-Pekan' : 'Townships'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('official')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap min-w-0 ${
              activeTab === 'official'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
              2. {language === 'bm' ? 'Portal Rasmi' : 'Official Portals'}
            </span>
          </button>
        </div>
      </div>

      {/* 1. Townships of Cameron Highlands */}
      {activeTab === 'townships' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="portal-townships">
          {TOWNSHIP_PORTALS.map((town) => {
            const customHub = hubs[town.name];
            const displayImg = customHub?.imageUrl || town.imageUrl;
            const displayDesc = customHub?.description || (language === 'bm' ? town.descriptionBm : town.description);
            const isSelected = selectedTownModal?.name === town.name;

            return (
              <React.Fragment key={town.name}>
                <div
                  onClick={() => {
                    setSelectedTownModal(
                      isSelected
                        ? null
                        : {
                            ...town,
                            ...customHub,
                            description: displayDesc,
                            imageUrl: displayImg,
                          }
                    );
                  }}
                  className={`relative glass-card-hover rounded-3xl p-5 bg-stone-900/80 border transition-all flex flex-col justify-between cursor-pointer group min-h-[350px] ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-stone-900' : 'border-white/5'
                  }`}
                >
                  {/* Normal Card Content (visible underneath on desktop or when unselected) */}
                  <div>
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-3">
                      <img src={displayImg} alt={town.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-mono font-bold">
                        {town.elevation} ASL
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-stone-100 group-hover:text-emerald-400 transition-colors">{town.name}</h4>
                    <div className="text-xs text-emerald-400 font-medium mb-2">
                      {town.vibe}
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed line-clamp-2">
                      {displayDesc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-stone-400">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> {isSelected ? 'Close Details' : 'View Details & Info'}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-emerald-400' : 'group-hover:translate-x-1'}`} />
                  </div>

                  {/* Mobile Pop-Up Modal: Opens directly on top of this town card on mobile (Zero page scrolling needed!) */}
                  {isSelected && (
                    <div
                      className="md:hidden absolute inset-0 z-40 bg-stone-950/98 backdrop-blur-md rounded-3xl p-4 overflow-y-auto border-2 border-emerald-500 shadow-2xl flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        {/* Sticky Top Header with Title and Prominent Close (X) Button */}
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 sticky top-0 bg-stone-950/95 backdrop-blur-md z-30 pt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                            <span className="text-xs font-mono font-bold text-emerald-400 truncate">
                              {town.name} Info
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTownModal(null);
                            }}
                            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-white/15 cursor-pointer transition-colors shadow-md active:scale-95 flex items-center justify-center shrink-0"
                            aria-label="Close modal"
                          >
                            <X className="w-4 h-4 text-emerald-400" />
                          </button>
                        </div>

                        {/* Compact Image with Elevation */}
                        <div className="relative w-full h-28 rounded-xl overflow-hidden mb-3 shrink-0">
                          <img src={displayImg} alt={town.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 backdrop-blur-md text-emerald-300 text-[10px] font-mono font-bold">
                              {town.elevation} ASL
                            </span>
                            <span className="text-xs font-bold text-white drop-shadow-md">
                              {town.name}
                            </span>
                          </div>
                        </div>

                        {/* Scrollable details & facilities */}
                        <div className="space-y-3 text-xs text-stone-300">
                          <p className="leading-relaxed text-[11px] text-stone-300">{displayDesc}</p>

                          {/* Facilities */}
                          <div className="p-3 rounded-xl bg-stone-900/90 border border-white/10 space-y-2">
                            <h5 className="font-bold text-emerald-400 text-[10px] uppercase tracking-wider">Essential Township Facilities</h5>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex items-start gap-2">
                                <Stethoscope className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                <div className="text-[11px]">
                                  <strong className="text-stone-200 block text-[10px]">Clinics / Hospital</strong>
                                  <span className="text-stone-400">{customHub?.clinicsOrHospitals || town.hospital || 'Nearby clinics in town'}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <div className="text-[11px]">
                                  <strong className="text-stone-200 block text-[10px]">Police Station</strong>
                                  <span className="text-stone-400">{customHub?.policeStation || town.police || 'Police presence in township'}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-[11px]">
                                  <strong className="text-stone-200 block text-[10px]">Public Toilet</strong>
                                  <span className="text-stone-400">{customHub?.publicToilet || 'Available in town center'}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Fuel className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <div className="text-[11px]">
                                  <strong className="text-stone-200 block text-[10px]">Gas Station</strong>
                                  <span className="text-stone-400">{customHub?.gasStation || 'Nearby petrol kiosk'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Places of Interest */}
                          <div>
                            <strong className="text-stone-200 block text-[11px] mb-1.5">Places of Interest:</strong>
                            <div className="flex flex-wrap gap-1">
                              {(customHub?.placesOfInterest || town.keyAttractions || []).map((attr: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded-lg bg-stone-800 text-[10px] text-stone-300">
                                  {attr}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons at bottom */}
                      <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTownModal(null);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 font-medium text-xs flex items-center justify-center cursor-pointer border border-white/10"
                        >
                          Close
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const townName = town.name as Township;
                            setSelectedTownModal(null);
                            onExploreTownOnMap(townName);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Explore on Map</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Expansion Panel right inside the grid row below the clicked card (PC View Only) */}
                {isSelected && (
                  <div className="hidden md:block col-span-1 md:col-span-2 lg:col-span-4 glass-panel rounded-3xl p-5 sm:p-6 bg-stone-950/95 border border-emerald-500/40 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                      <span className="text-xs font-mono font-bold text-emerald-400">Township Info &amp; Facilities: {selectedTownModal.name}</span>
                      <button
                        onClick={() => setSelectedTownModal(null)}
                        className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-white/15 cursor-pointer transition-colors shadow-md active:scale-95 flex items-center justify-center"
                        aria-label="Close details"
                      >
                        <X className="w-5 h-5 text-emerald-400" />
                      </button>
                    </div>

                    <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden mb-5">
                      <img src={selectedTownModal.imageUrl} alt={selectedTownModal.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold mb-1 inline-block">
                          {selectedTownModal.elevation} ASL
                        </span>
                        <h3 className="text-2xl font-bold text-stone-100">{selectedTownModal.name}</h3>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm text-stone-300">
                      <p className="leading-relaxed">{selectedTownModal.description}</p>

                      <div className="p-4 rounded-2xl bg-stone-900/80 border border-white/10 space-y-3">
                        <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Essential Township Facilities</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-start gap-2">
                            <Stethoscope className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-stone-200 block text-xs">Clinics / Hospital</strong>
                              <span className="text-stone-400 text-xs">{selectedTownModal.clinicsOrHospitals || selectedTownModal.hospital}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-stone-200 block text-xs">Police Station</strong>
                              <span className="text-stone-400 text-xs">{selectedTownModal.policeStation || selectedTownModal.police}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-stone-200 block text-xs">Public Toilet</strong>
                              <span className="text-stone-400 text-xs">{selectedTownModal.publicToilet || 'Available in town center'}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Fuel className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-stone-200 block text-xs">Gas Station</strong>
                              <span className="text-stone-400 text-xs">{selectedTownModal.gasStation || 'Nearby petrol kiosk'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <strong className="text-stone-200 block mb-2">Places of Interest:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedTownModal.placesOfInterest || selectedTownModal.keyAttractions || []).map((attr: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 rounded-xl bg-stone-800 text-xs text-stone-300">
                              {attr}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          onClick={() => {
                            const townName = selectedTownModal.name as Township;
                            onExploreTownOnMap(townName);
                            setSelectedTownModal(null);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                          <Compass className="w-4 h-4" />
                          <span>Explore {selectedTownModal.name} on Interactive Map</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}



      {/* 2. Official Portals */}
      {activeTab === 'official' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="portal-official">
          {OFFICIAL_PORTALS.map((portal, idx) => (
            <div
              key={idx}
              className="glass-card-hover rounded-3xl p-5 bg-stone-900/80 border border-white/5 flex flex-col justify-between"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider block w-fit mb-2">
                  {portal.type}
                </span>

                <h4 className="text-base font-bold text-stone-100">
                  {language === 'bm' ? portal.nameBm : portal.name}
                </h4>

                <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                  {language === 'bm' ? portal.descriptionBm : portal.description}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-stone-400 font-mono">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{portal.phone}</span>
                </div>
              </div>

              <a
                href={portal.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{language === 'bm' ? 'Layari Portal Rasmi' : 'Visit Official Portal'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
