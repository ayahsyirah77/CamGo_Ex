import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Stethoscope,
  Search,
  X,
  FileText,
  Hospital,
  ShieldAlert,
} from 'lucide-react';
import { Language } from '../types';
import { FOREIGNER_MEDICAL_SCHEDULES } from '../data/foreignerMedicalCharges';

interface ForeignerMedicalChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ForeignerMedicalChargesModal: React.FC<ForeignerMedicalChargesModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [activeSchedule, setActiveSchedule] = useState<'ALL' | 'FA' | 'FB' | 'FC' | 'CARDIO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FOREIGNER_MEDICAL_SCHEDULES.filter(
      (sch) => activeSchedule === 'ALL' || sch.id === activeSchedule
    )
      .map((sch) => ({
        ...sch,
        groups: sch.groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
              if (!q) return true;
              return (
                item.name.toLowerCase().includes(q) ||
                item.charge.toLowerCase().includes(q) ||
                (item.note && item.note.toLowerCase().includes(q)) ||
                group.title.toLowerCase().includes(q) ||
                sch.code.toLowerCase().includes(q) ||
                sch.titleEn.toLowerCase().includes(q)
              );
            }),
          }))
          .filter((group) => group.items.length > 0),
      }))
      .filter((sch) => sch.groups.length > 0);
  }, [activeSchedule, searchQuery]);

  if (!isOpen) return null;

  const totalMatchingItems = filteredSchedules.reduce(
    (sum, sch) => sum + sch.groups.reduce((gSum, g) => gSum + g.items.length, 0),
    0
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] bg-stone-950 overflow-y-auto overscroll-contain touch-pan-y text-stone-100 animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="min-h-full w-full flex flex-col">
        <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 pb-20 space-y-4">
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-md shrink-0">
                <Hospital className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-xl font-heading font-black text-white tracking-tight">
                    {language === 'bm'
                      ? 'Caj Rawatan Bukan Warganegara'
                      : "Government Hospitals' Treatment Charges for Foreigners"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30">
                    Fees Act (Medical) 1951
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                  {language === 'bm'
                    ? 'Hospital kerajaan menyediakan rawatan kesihatan kepada warga asing mengikut Akta Fi (Perubatan) 1951 bagi Warganegara Asing.'
                    : 'Caj Rawatan Bukan Warganegara • Official Malaysian Government Hospital & Clinic tariff guide for foreign citizens.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-rose-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Schedule Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'bm'
                    ? 'Cari rawatan (cth. Outpatient, X-Ray, Ward, Caesarean, Dialysis, Dental, Bypass)...'
                    : 'Search treatment or fee (e.g. Outpatient, X-Ray, Ward, Dialysis, Caesarean, Dental, Bypass)...'
                }
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-stone-950/85 border border-white/10 focus:border-rose-500/60 text-stone-100 placeholder-stone-500 text-xs sm:text-sm outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL' as const, label: language === 'bm' ? 'Semua Jadual' : 'All Schedules' },
                  { id: 'FA' as const, label: 'Schedule FA: Outpatient' },
                  { id: 'FB' as const, label: 'Schedule FB: Hospital' },
                  { id: 'FC' as const, label: 'Schedule FC: Dental & T&CM' },
                  { id: 'CARDIO' as const, label: 'Cardiology & Cardiothoracic' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSchedule(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      activeSchedule === tab.id
                        ? 'bg-rose-500/20 border-rose-400/60 text-rose-200 shadow-sm'
                        : 'bg-stone-950/70 border-white/10 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {totalMatchingItems} {language === 'bm' ? 'item rawatan' : 'fee items'}
              </span>
            </div>
          </div>

          {/* Info Callout */}
          <div className="p-3 rounded-2xl bg-amber-950/35 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200/90">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'bm'
                ? 'Untuk kes kecemasan di Cameron Highlands, terus ke Unit Kecemasan Hospital Sultanah Hajah Kalsom (Tanah Rata • +60 5-491 1866). Bayaran di kaunter hospital tertakluk kepada Jadual Akta Fi (Perubatan) 1951.'
                : 'For urgent care in Cameron Highlands, proceed to Hospital Sultanah Hajah Kalsom (Tanah Rata • 24H Emergency: +60 5-491 1866). Hospital counter billing follows the Fees Act (Medical) 1951 for Foreigners.'}
            </p>
          </div>

          {/* Schedules List */}
          {filteredSchedules.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-950/70 border border-white/5 space-y-2">
              <Stethoscope className="w-7 h-7 text-stone-500 mx-auto" />
              <p className="text-xs font-bold text-stone-300">
                {language === 'bm'
                  ? `Tiada rawatan sepadan dengan "${searchQuery}"`
                  : `No medical charges matching "${searchQuery}"`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSchedule('ALL');
                }}
                className="text-xs text-rose-400 hover:underline font-bold cursor-pointer"
              >
                {language === 'bm' ? 'Tunjukkan Semua Jadual' : 'Show All Schedules'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredSchedules.map((schedule) => (
                <section
                  key={schedule.id}
                  className="rounded-2xl bg-stone-950/75 border border-white/10 overflow-hidden shadow-lg"
                >
                  <div className="px-4 py-3 bg-gradient-to-r from-rose-950/60 via-stone-900 to-stone-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      <h4 className="text-sm font-extrabold text-white">
                        {schedule.titleEn} ({schedule.code})
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-rose-300">
                      {schedule.titleBm}
                    </span>
                  </div>

                  <div className="p-3 sm:p-4 space-y-4">
                    {schedule.groups.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            {group.title}
                          </h5>
                          {group.subtitle && (
                            <p className="text-[11px] text-stone-400 mt-0.5">{group.subtitle}</p>
                          )}
                        </div>

                        <div className="rounded-xl border border-white/10 overflow-hidden">
                          <div className="grid grid-cols-12 bg-stone-900/90 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 border-b border-white/10">
                            <div className="col-span-8">Types of facility / Treatment</div>
                            <div className="col-span-4 text-right">Charges (RM)</div>
                          </div>
                          <div className="divide-y divide-white/5">
                            {group.items.map((item, idx) => (
                              <div
                                key={`${group.id}-${idx}`}
                                className="grid grid-cols-12 items-center px-3 py-2 text-xs hover:bg-stone-900/60 transition-colors gap-2"
                              >
                                <div className="col-span-8 text-stone-200">
                                  <span className="font-medium">{item.name}</span>
                                  {item.note && (
                                    <span className="block text-[10px] text-stone-400 mt-0.5">
                                      {item.note}
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-4 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                                  {item.charge}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
