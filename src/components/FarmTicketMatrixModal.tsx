import React, { useState } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  MapPin,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { formatOperatingHours } from '../utils/highlandLogic';
import { Language, FarmTicket } from '../types';
import { firebaseService } from '../services/firebase';

interface FarmTicketMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onAddAttractionCost?: (item: FarmTicket) => void;
}

export const FarmTicketMatrixModal: React.FC<FarmTicketMatrixModalProps> = ({
  isOpen,
  onClose,
  language,
  onAddAttractionCost,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [tickets, setTickets] = React.useState<FarmTicket[]>(() => firebaseService.getFarmTickets());

  React.useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setTickets(e.detail);
      else setTickets(firebaseService.getFarmTickets());
    };
    window.addEventListener('farm-tickets-updated', handleUpdate);
    return () => window.removeEventListener('farm-tickets-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter((t) => {
    if (filterType === 'free') return t.isFree;
    if (filterType === 'paid') return !t.isFree;
    return true;
  });

  const handleAddBudget = (ticket: FarmTicket) => {
    if (onAddAttractionCost) {
      onAddAttractionCost(ticket);
    }
    setAddedItemIds((prev) => ({ ...prev, [ticket.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [ticket.id]: false }));
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/95 sm:bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl bg-stone-900 sm:border sm:border-emerald-500/40 sm:rounded-3xl rounded-none shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-stone-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                BUDGET &amp; PRICING MATRIX
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-stone-100 tracking-tight">
                {language === 'bm' ? 'Matriks Perbandingan Tiket & Ladang' : 'Farm Pass & Ticket Comparison Matrix'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="p-4 border-b border-white/10 bg-stone-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-300 hover:text-white border border-white/5'
              }`}
            >
              All Spots ({tickets.length})
            </button>
            <button
              onClick={() => setFilterType('free')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'free'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-300 hover:text-white border border-white/5'
              }`}
            >
              Free Admission ({tickets.filter((t) => t.isFree).length})
            </button>
            <button
              onClick={() => setFilterType('paid')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'paid'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-300 hover:text-white border border-white/5'
              }`}
            >
              Paid Entry ({tickets.filter((t) => !t.isFree).length})
            </button>
          </div>

          <span className="text-xs text-stone-400">
            Click <strong className="text-emerald-400">"Add to Itinerary"</strong> to include pricing in your itinerary cost calculator.
          </span>
        </div>

        {/* Matrix Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            ticket.isFree
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {ticket.isFree ? 'FREE ADMISSION' : 'PAID ENTRY'}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {ticket.township}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-stone-100">{ticket.name}</h3>
                      {ticket.location && (
                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">{ticket.location}</p>
                      )}
                    </div>


                    <div className="text-right shrink-0 font-mono">
                      {ticket.isFree ? (
                        <div className="text-emerald-400 font-black text-sm">FREE</div>
                      ) : (
                        <div>
                          <div className="text-amber-300 font-extrabold text-sm">Adult: RM{ticket.adultPriceRm}</div>
                          <div className="text-stone-400 text-[10px]">Child: RM{ticket.childPriceRm}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed">{ticket.description}</p>
                </div>

                {/* Opening Hours & Inclusions */}
                <div className="space-y-2.5 pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-stone-300 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{formatOperatingHours(ticket.operatingHours)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-stone-400 uppercase">Entry Inclusions:</div>
                    <div className="flex flex-wrap gap-1">
                      {ticket.inclusions.map((inc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-stone-950 text-stone-300 text-[10px] border border-white/5 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{inc}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => handleAddBudget(ticket)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      addedItemIds[ticket.id]
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : ticket.isFree
                        ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950'
                    }`}
                  >
                    {addedItemIds[ticket.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added to Itinerary Budget!</span>
                      </>
                    ) : (
                      <>
                        <Tag className="w-3.5 h-3.5" />
                        <span>Add to Itinerary Budget (RM {ticket.adultPriceRm})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
