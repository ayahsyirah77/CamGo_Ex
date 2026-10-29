import React, { useState } from 'react';
import { HazardAlert, Language } from '../types';
import { getTranslation } from '../services/i18n';
import { hazardFeedService, OFFICIAL_AGENCIES } from '../services/hazardFeedService';
import {
  AlertTriangle,
  ShieldAlert,
  CloudFog,
  Hammer,
  PhoneCall,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Building2,
  Car,
  Compass,
  Clock,
  Radio,
  FileCheck2,
  TreePine,
  ShieldCheck,
} from 'lucide-react';

interface HazardWidgetProps {
  hazards: HazardAlert[];
  language: Language;
}

export const HazardWidget: React.FC<HazardWidgetProps> = ({ hazards, language }) => {
  const [filterAgency, setFilterAgency] = useState<'ALL' | 'JKR' | 'MDCH' | 'CRITICAL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const isBm = language === 'bm';

  const handleManualSync = async () => {
    setIsRefreshing(true);
    setSyncFeedback(isBm ? 'Menyambung ke Portal JKR eBencana & MDCH...' : 'Connecting to JKR eBencana & MDCH portals...');
    try {
      const res = await hazardFeedService.syncFeeds();
      if (res.success) {
        setSyncFeedback(
          isBm
            ? `Berjaya diselaraskan: ${res.alerts.length} makluman terkini dari JKR & MDCH`
            : `Synced successfully: ${res.alerts.length} verified bulletins from JKR & MDCH`
        );
      } else {
        setSyncFeedback(isBm ? 'Kemas kini selesai dari pangkalan data.' : 'Updated from official cache.');
      }
    } catch {
      setSyncFeedback(isBm ? 'Gagal menghubungi suapan, menggunakan data terkini.' : 'Using cached verified bulletins.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setSyncFeedback(null), 4500);
    }
  };

  const getHazardIcon = (type: HazardAlert['type']) => {
    switch (type) {
      case 'fog':
        return <CloudFog className="w-5 h-5 text-teal-400" />;
      case 'roadwork':
        return <Hammer className="w-5 h-5 text-amber-400" />;
      case 'road_closure':
        return <Car className="w-5 h-5 text-rose-400" />;
      case 'landslide':
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  const getSeverityBadge = (sev: HazardAlert['severity']) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            {isBm ? 'Bahaya Kritikal' : 'Critical Hazard'}
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {isBm ? 'Amaran Berjaga-jaga' : 'Advisory Warning'}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {isBm ? 'Notis Langkah Selamat' : 'Precaution Notice'}
          </span>
        );
    }
  };

  const filteredHazards = hazards.filter((h) => {
    if (filterAgency === 'CRITICAL') return h.severity === 'critical';
    if (filterAgency === 'JKR') return h.agency === 'JKR' || h.source?.toLowerCase().includes('jkr');
    if (filterAgency === 'MDCH') return h.agency === 'MDCH' || h.source?.toLowerCase().includes('mdch');
    return true;
  });

  const jkrCount = hazards.filter((h) => h.agency === 'JKR' || h.source?.toLowerCase().includes('jkr')).length;
  const mdchCount = hazards.filter((h) => h.agency === 'MDCH' || h.source?.toLowerCase().includes('mdch')).length;
  const criticalCount = hazards.filter((h) => h.severity === 'critical').length;

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-amber-500/25 shadow-2xl relative overflow-hidden group">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              <Radio className="w-3 h-3 animate-pulse text-rose-400" />
              {isBm ? 'Suapan Rasmi JKR eBencana & MDCH' : 'Official JKR eBencana & MDCH Feeds'}
            </span>
            <span className="text-[10px] text-stone-400 hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {isBm ? 'Disahkan Agensi Kerajaan' : 'Government Agency Verified'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-100 tracking-tight">
            {getTranslation(language, 'widget_hazard_title')}
          </h3>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
            {isBm
              ? 'Integrasi makluman tanah runtuh, keselamatan cerun FT059/FT185/FT102 dari JKR Cameron Highlands dan notis perbandaran Majlis Daerah Cameron Highlands (MDCH).'
              : 'Direct integration of real-time landslides, slope warnings for FT059/FT185/FT102 from JKR Cameron Highlands and municipal notices from MDCH.'}
          </p>
        </div>

        {/* Sync Controls & Hotline */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh official bulletins from JKR eBencana and MDCH"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? (isBm ? 'Menyelaras...' : 'Syncing...') : (isBm ? 'Kemaskini Suapan' : 'Sync Official Feeds')}</span>
          </button>

          <a
            href="tel:999"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
            <span>Highland SOS: 999</span>
          </a>
        </div>
      </div>

      {/* Sync Feedback Toast Banner */}
      {syncFeedback && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Live Sync</span>
        </div>
      )}

      {/* Official Agencies Reference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {OFFICIAL_AGENCIES.map((agency) => (
          <div
            key={agency.id}
            className="p-3.5 rounded-2xl bg-stone-900/70 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${agency.id === 'JKR' ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'}`}>
                    {agency.id === 'JKR' ? <Car className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                  <h4 className="text-xs font-bold text-stone-100">{agency.name}</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-white/5 font-mono">
                  {agency.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                {agency.jurisdiction}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[11px]">
              <a
                href={agency.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-semibold"
              >
                <span>{agency.id === 'JKR' ? 'eBencana Portal' : 'Portal Rasmi MDCH'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-stone-600">•</span>
              <a
                href={agency.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-semibold"
              >
                <span>Facebook Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-stone-600">•</span>
              <a
                href={`tel:${agency.hotline.replace(/\s+/g, '')}`}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 font-mono font-bold"
              >
                <PhoneCall className="w-2.5 h-2.5" />
                <span>{agency.hotline}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Agency Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => setFilterAgency('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterAgency === 'ALL'
              ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-white/5'
          }`}
        >
          {isBm ? 'Semua Makluman' : 'All Bulletins'} ({hazards.length})
        </button>

        <button
          onClick={() => setFilterAgency('JKR')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterAgency === 'JKR'
              ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-white/5'
          }`}
        >
          <span>JKR Cerun & Jalan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-900/50 text-[10px]">{jkrCount}</span>
        </button>

        <button
          onClick={() => setFilterAgency('MDCH')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterAgency === 'MDCH'
              ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-white/5'
          }`}
        >
          <span>MDCH Perbandaran</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-900/50 text-[10px]">{mdchCount}</span>
        </button>

        {criticalCount > 0 && (
          <button
            onClick={() => setFilterAgency('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterAgency === 'CRITICAL'
                ? 'bg-rose-500 text-white shadow-md font-extrabold'
                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{isBm ? 'Kritikal Sahaja' : 'Critical Only'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-950/80 text-[10px]">{criticalCount}</span>
          </button>
        )}
      </div>

      {/* Hazard Bulletins List */}
      <div className="space-y-4">
        {filteredHazards.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-stone-900/40 border border-white/5 space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-stone-200">
              {isBm ? 'Tiada Amaran Aktif Dalam Kategori Ini' : 'No Active Bulletins In This Category'}
            </div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {isBm
                ? 'Laluan dan kawasan berkaitan berada dalam keadaan selamat dan dipantau oleh pihak berkuasa.'
                : 'All roadways and municipal stretches are clear and monitored by relevant agencies.'}
            </p>
          </div>
        ) : (
          filteredHazards.map((hazard) => {
            const isJkr = hazard.agency === 'JKR' || hazard.source?.toLowerCase().includes('jkr');
            const officialUrl =
              hazard.sourceUrl ||
              (isJkr ? 'https://bencanaalam.jkr.gov.my' : 'https://mdcameron.gov.my');

            return (
              <div
                key={hazard.id}
                className="glass-card-hover rounded-2xl p-4 sm:p-5 bg-stone-900/85 border border-white/10 hover:border-amber-500/30 transition-all space-y-3"
              >
                {/* Card Top: Agency Badge, Ref No, Severity */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase ${
                        isJkr
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      <FileCheck2 className="w-3 h-3" />
                      {hazard.agencyName || hazard.source || (isJkr ? 'JKR Cameron Highlands' : 'MDCH Cameron Highlands')}
                    </span>

                    {hazard.referenceNo && (
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded border border-white/5">
                        {hazard.referenceNo}
                      </span>
                    )}
                  </div>

                  <div>{getSeverityBadge(hazard.severity)}</div>
                </div>

                {/* Title & Location */}
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-stone-800 border border-white/10 shrink-0 mt-0.5">
                    {getHazardIcon(hazard.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-stone-100 leading-snug">
                      {isBm ? hazard.titleBm || hazard.title : hazard.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium mt-1">
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span>{hazard.location}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-stone-300 leading-relaxed pl-11">
                  {isBm ? hazard.descriptionBm || hazard.description : hazard.description}
                </p>

                {/* Action Taken (On-Site Response) */}
                {(hazard.actionTaken || hazard.actionTakenBm) && (
                  <div className="ml-11 p-2.5 rounded-xl bg-stone-950/60 border border-white/5 text-[11px] text-stone-300 flex items-start gap-2">
                    <Hammer className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">
                        {isBm ? 'Tindakan Di Lokasi: ' : 'On-Site Action: '}
                      </span>
                      <span>{isBm ? hazard.actionTakenBm || hazard.actionTaken : hazard.actionTaken}</span>
                    </div>
                  </div>
                )}

                {/* Footer Metadata & External Link */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-[11px] text-stone-400 pl-11">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{hazard.reportedAt || hazard.reportedTime || hazard.timestamp}</span>
                    </span>

                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle className="w-3 h-3" />
                      <span>{hazard.status || (isBm ? 'Dipantau Agensi' : 'Monitored by Agency')}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {hazard.agencyHotline && (
                      <a
                        href={`tel:${hazard.agencyHotline.replace(/\s+/g, '')}`}
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-mono font-bold"
                        title="Call agency emergency line"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{hazard.agencyHotline}</span>
                      </a>
                    )}

                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                    >
                      <span>{isBm ? 'Lihat Notis Agensi' : 'View Agency Notice'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
