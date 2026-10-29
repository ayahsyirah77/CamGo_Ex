import React from 'react';
import { EventNotification, Language } from '../types';
import { getTranslation } from '../services/i18n';
import { Calendar, MapPin, Tag, ArrowRight } from 'lucide-react';

interface EventsWidgetProps {
  events: EventNotification[];
  language: Language;
}

export const EventsWidget: React.FC<EventsWidgetProps> = ({ events, language }) => {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {language === 'bm' ? 'ACARA & HEBAHAN' : 'LIVE HIGHLAND CALENDAR'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-100 tracking-tight mt-1">
            {getTranslation(language, 'widget_events_title')}
          </h3>
          <p className="text-xs text-stone-400">
            {getTranslation(language, 'widget_events_subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.length === 0 ? (
          <div className="col-span-2 p-8 text-center rounded-2xl bg-stone-900/40 border border-white/5 space-y-2">
            <Calendar className="w-8 h-8 text-purple-400 mx-auto" />
            <div className="text-sm font-bold text-stone-200">
              {language === 'bm' ? 'Tiada Acara Dijadualkan Buat Masa Ini' : 'No Events Scheduled'}
            </div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {language === 'bm'
                ? 'Pemberitahuan festival highland, pasar malam dan acara komuniti akan dipaparkan di sini.'
                : 'Upcoming highland seasonal festivals, farmers markets, and events will appear here once announced.'}
            </p>
          </div>
        ) : (
          events.map((evt) => (
          <div
            key={evt.id}
            className="glass-card-hover rounded-2xl overflow-hidden bg-stone-900/80 border border-white/5 flex flex-col justify-between"
          >
            {evt.imageUrl && (
              <div className="h-40 relative overflow-hidden">
                <img
                  src={evt.imageUrl}
                  alt={evt.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold tracking-wide uppercase shadow-md">
                    {evt.category}
                  </span>
                </div>
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-stone-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {evt.township}
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{evt.date}</span>
                </div>
                <h4 className="text-base font-bold text-stone-100 mb-2 leading-snug">
                  {language === 'bm' ? evt.titleBm : evt.title}
                </h4>
                <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                  {language === 'bm' ? evt.descriptionBm : evt.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-stone-400">
                <span className="truncate max-w-[200px]">{evt.location}</span>
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                  {language === 'bm' ? 'Terbuka' : 'Ongoing'}
                </span>
              </div>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
};
