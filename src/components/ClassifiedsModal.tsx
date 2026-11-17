import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JobClassified, Language, Township } from '../types';
import { firebaseService, UserProfile } from '../services/firebase';
import {
  Briefcase,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Plus,
  X,
  Calendar,
  CheckCircle,
  Loader2,
  Trash2,
  Send,
} from 'lucide-react';

interface ClassifiedsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentUser: UserProfile | null;
  onOpenPostClassified?: () => void;
}

const TOWNSHIPS_LIST: Township[] = [
  'Tanah Rata',
  'Brinchang',
  'Kea Farm',
  'Ringlet',
  'Kampung Raja',
  'Tringkap',
  'Kuala Terla',
  'Bertam Valley',
  'Blue Valley',
];

export const ClassifiedsModal: React.FC<ClassifiedsModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUser,
}) => {
  const [jobs, setJobs] = useState<JobClassified[]>(() => firebaseService.getJobs());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [townshipFilter, setTownshipFilter] = useState<string>('All');

  // Inline Post New Classified Form Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postType, setPostType] = useState<string>('Job Offer');
  const [postTownship, setPostTownship] = useState<Township>('Tanah Rata');
  const [postCompany, setPostCompany] = useState('');
  const [postSalary, setPostSalary] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postContact, setPostContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSuccessMsg, setPostSuccessMsg] = useState<string | null>(null);

  // Dynamic real-time synchronization with newly posted classifieds
  useEffect(() => {
    if (isOpen) {
      setJobs(firebaseService.getJobs());
    }

    const handleJobsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getJobs();
      setJobs(updated);
    };

    window.addEventListener('jobs-updated', handleJobsUpdated);
    return () => window.removeEventListener('jobs-updated', handleJobsUpdated);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenPostModal = () => {
    setPostTitle('');
    setPostType('Job Offer');
    setPostTownship('Tanah Rata');
    setPostCompany(currentUser?.displayName || '');
    setPostSalary('');
    setPostDescription('');
    setPostContact(currentUser?.email || '');
    setShowPostModal(true);
  };

  const handleSubmitClassified = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim() || !postContact.trim()) return;

    setIsSubmitting(true);
    try {
      const cleanCompany = postCompany.trim() || currentUser?.displayName || 'Highland Community Member';
      const newJob: JobClassified = {
        id: 'job-usr-' + Date.now().toString(36),
        title: postTitle.trim(),
        company: cleanCompany,
        township: postTownship,
        type: postType,
        category: postType,
        salary: postSalary.trim() || (language === 'bm' ? 'Boleh Dirunding' : 'Negotiable'),
        description: postDescription.trim(),
        contact: postContact.trim(),
        postedDate: new Date().toISOString().split('T')[0],
        isUserCreated: true,
        authorEmail: currentUser?.email || 'guest@camgo.my',
        authorName: currentUser?.displayName || cleanCompany,
      };

      const updated = firebaseService.saveJob(newJob);
      setJobs(updated);
      setCategoryFilter('All');
      setTownshipFilter('All');
      setSearchQuery('');
      setShowPostModal(false);
      setPostSuccessMsg(
        language === 'bm'
          ? `Iklan "${newJob.title}" berjaya diterbitkan!`
          : `Classified "${newJob.title}" published live!`
      );
      setTimeout(() => setPostSuccessMsg(null), 4000);

      // Broadcast real-time posting alert over Firestore Grid to all connected visitors
      const notifId = 'bc-job-' + Date.now();
      const notifPayload = {
        title: `New ${newJob.type}: ${newJob.title}`,
        message: `${newJob.company} (${newJob.township}) • ${newJob.salary}`,
        sender: newJob.authorName || 'Highland Explorer',
      };
      if (db) {
        setDoc(doc(db, 'broadcast_notifications', notifId), {
          event: 'job_posted',
          priority: 'low',
          payload: notifPayload,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'job_posted',
          priority: 'low',
          payload: notifPayload,
        }),
      }).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = (id: string) => {
    const updated = firebaseService.deleteJob(id);
    setJobs(updated);
  };

  const categoryTabs = [
    { key: 'All', labelEn: 'All Listings', labelBm: 'Semua Iklan' },
    { key: 'Job Offer', labelEn: 'Job Offers', labelBm: 'Tawaran Kerja' },
    { key: 'Job Wanted', labelEn: 'Jobs Wanted', labelBm: 'Mencari Kerja' },
    { key: 'Interview', labelEn: 'Interview', labelBm: 'Temuduga' },
    { key: 'Service', labelEn: 'Services', labelBm: 'Perkhidmatan' },
    { key: 'Item', labelEn: 'Items Sale / Wanted', labelBm: 'Jual / Beli' },
  ];

  const townships: (Township | 'All')[] = ['All', ...TOWNSHIPS_LIST];

  const filteredJobs = jobs.filter((job) => {
    if (categoryFilter !== 'All') {
      if (categoryFilter === 'Job Offer') {
        if (job.type !== 'Job Offer' && job.category !== 'Job Offer') return false;
      } else if (categoryFilter === 'Job Wanted') {
        if (job.type !== 'Job Wanted' && job.category !== 'Job Wanted') return false;
      } else if (categoryFilter === 'Interview') {
        const t = (job.type || '').toLowerCase();
        const c = (job.category || '').toLowerCase();
        if (!t.includes('interview') && !c.includes('interview')) return false;
      } else if (categoryFilter === 'Service') {
        const t = (job.type || '').toLowerCase();
        const c = (job.category || '').toLowerCase();
        if (!t.includes('service') && !c.includes('service')) return false;
      } else if (categoryFilter === 'Item') {
        const t = (job.type || '').toLowerCase();
        const c = (job.category || '').toLowerCase();
        if (!t.includes('item') && !c.includes('item') && !t.includes('sale') && !c.includes('sale')) return false;
      }
    }

    if (townshipFilter !== 'All' && job.township !== townshipFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchCompany = job.company.toLowerCase().includes(q);
      const matchTownship = job.township.toLowerCase().includes(q);
      const matchDesc = job.description.toLowerCase().includes(q);
      const matchSalary = job.salary.toLowerCase().includes(q);
      const matchType = job.type.toLowerCase().includes(q);
      if (!matchTitle && !matchCompany && !matchTownship && !matchDesc && !matchSalary && !matchType) {
        return false;
      }
    }

    return true;
  });

  const getCategoryBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('job offer')) {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    }
    if (t.includes('job wanted')) {
      return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
    }
    if (t.includes('interview')) {
      return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
    }
    if (t.includes('service')) {
      return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
    }
    if (t.includes('sale') || t.includes('item')) {
      return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    }
    return 'bg-teal-500/15 border-teal-500/30 text-teal-300';
  };

  const getContactLink = (contact: string) => {
    const clean = contact.replace(/[^0-9]/g, '');
    if (contact.toLowerCase().includes('whatsapp') || clean.length >= 8) {
      const phoneDigits = clean.startsWith('60') ? clean : clean.startsWith('0') ? '6' + clean : clean;
      return {
        url: `https://wa.me/${phoneDigits}`,
        label: 'WhatsApp',
        isWhatsapp: true,
      };
    }
    if (contact.includes('@')) {
      return {
        url: `mailto:${contact.trim()}`,
        label: 'Email',
        isWhatsapp: false,
      };
    }
    return {
      url: `tel:${clean}`,
      label: 'Call',
      isWhatsapp: false,
    };
  };

  const canDeleteJob = (job: JobClassified) => {
    if (!job.isUserCreated && !job.authorEmail) return false;
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.email && job.authorEmail) {
      return currentUser.email.toLowerCase() === job.authorEmail.toLowerCase();
    }
    return job.authorEmail === 'guest@camgo.my';
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-full flex flex-col items-center justify-start p-2 sm:p-4 py-8 sm:py-16" onClick={onClose}>
        <div
          className="glass-panel w-full max-w-6xl rounded-3xl p-4 sm:p-6 bg-stone-900/95 border border-amber-500/40 shadow-2xl relative space-y-4 my-auto shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Top Header Bar */}
          <div className="sticky top-0 z-30 pb-3 border-b border-white/10 bg-stone-900/95 backdrop-blur-md -mx-4 -mt-4 p-4 sm:-mx-6 sm:-mt-6 sm:p-6 rounded-t-3xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md">
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-xl font-heading font-black text-white tracking-tight">
                    {language === 'bm' ? 'Iklan & Jawatan Kosong' : 'Classifieds & Job Postings'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] sm:text-xs font-bold border border-amber-500/30">
                    {jobs.length} {language === 'bm' ? 'Iklan' : 'Active Listings'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                  {language === 'bm'
                    ? 'Papan iklan komuniti Cameron Highlands: Jawatan, servis, & jualan barangan'
                    : 'Highland community postings: Job offers, jobs wanted, services & items'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Post New Classified CTA */}
              <button
                type="button"
                onClick={handleOpenPostModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/70 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'bm' ? 'Terbitkan Iklan' : 'Post Classified'}
                </span>
                <span className="sm:hidden">
                  {language === 'bm' ? 'Iklan Baru' : 'Post'}
                </span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Success Toast Banner */}
          {postSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{postSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setPostSuccessMsg(null)}
                className="text-emerald-300 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search & Category Filter Controls */}
          <div className="space-y-3 pt-1">
            {/* Search bar & Township selector */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'bm'
                      ? 'Cari mengikut jawatan, perkhidmatan, syarikat, atau pekan...'
                      : 'Search by title, role, service, poster name, or keywords...'
                  }
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-stone-950/80 border border-white/10 text-stone-100 placeholder-stone-500 text-xs sm:text-sm focus:border-amber-500 focus:outline-none transition-colors"
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

              <div className="sm:col-span-4 relative">
                <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={townshipFilter}
                  onChange={(e) => setTownshipFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-950/80 border border-white/10 text-stone-100 text-xs sm:text-sm focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer"
                >
                  {townships.map((town) => (
                    <option key={town} value={town} className="bg-stone-900 text-stone-100">
                      {town === 'All'
                        ? (language === 'bm' ? 'Semua Pekan Tanah Tinggi' : 'All Townships')
                        : town}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {categoryTabs.map((tab) => {
                const isActive = categoryFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCategoryFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-sm'
                        : 'bg-stone-950/60 border-white/10 text-stone-400 hover:text-stone-200 hover:border-white/20'
                    }`}
                  >
                    {language === 'bm' ? tab.labelBm : tab.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listings Result Count & Dynamic Sync Indicator */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 border-t border-white/5 pt-2">
            <div className="flex items-center gap-2">
              <span>
                {language === 'bm' ? 'Memaparkan' : 'Showing'}{' '}
                <strong className="text-stone-200">{filteredJobs.length}</strong>{' '}
                {language === 'bm' ? 'iklan' : 'listings'}
              </span>
              {searchQuery && (
                <span className="text-amber-400 font-medium">
                  • {language === 'bm' ? 'Carian:' : 'Filter:'} &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{language === 'bm' ? 'Kemas kini Langsung' : 'Live Synced'}</span>
            </div>
          </div>

          {/* Classifieds Grid */}
          {filteredJobs.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-stone-950/60 border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-500 mx-auto flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-stone-300">
                {language === 'bm' ? 'Tiada iklan ditemui' : 'No classified listings found'}
              </h5>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {language === 'bm'
                  ? 'Cuba tukar kata kunci carian atau terbitkan iklan baru anda sekarang.'
                  : 'Try adjusting your filters or post a new highland classified listing right now.'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleOpenPostModal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bm' ? 'Terbitkan Iklan' : 'Post Classified'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                    setTownshipFilter('All');
                  }}
                  className="text-xs text-amber-400 hover:underline font-bold cursor-pointer"
                >
                  {language === 'bm' ? 'Tetapkan Semula Penapis' : 'Reset All Filters'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredJobs.map((job) => {
                const contactInfo = getContactLink(job.contact);
                const isUserListing = Boolean(job.isUserCreated || job.authorEmail);

                return (
                  <div
                    key={job.id}
                    className="rounded-2xl p-4 bg-stone-900/90 border border-white/10 hover:border-amber-500/40 transition-all duration-200 flex flex-col justify-between shadow-lg group relative overflow-hidden"
                  >
                    {isUserListing && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent pointer-events-none rounded-tr-2xl" />
                    )}

                    <div className="space-y-2">
                      {/* Top Row: Type Badge + Salary/Price Tag */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeColor(
                              job.type
                            )}`}
                          >
                            {job.type}
                          </span>
                          {isUserListing && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              {language === 'bm' ? 'Komuniti' : 'New Post'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0">
                          {job.salary}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-stone-100 group-hover:text-amber-300 transition-colors leading-snug">
                        {job.title}
                      </h4>

                      {/* Company & Township */}
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                        <span className="font-semibold text-stone-300 truncate max-w-[140px]">
                          {job.company}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-emerald-400 shrink-0">
                          <MapPin className="w-3 h-3" />
                          <span>{job.township}</span>
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-stone-300/90 leading-relaxed line-clamp-3 pt-1">
                        {job.description}
                      </p>
                    </div>

                    {/* Card Footer: Date, Optional Delete & Contact Button */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{job.postedDate || 'Recent'}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {canDeleteJob(job) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title={language === 'bm' ? 'Padam Iklan' : 'Delete Listing'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={contactInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 ${
                            contactInfo.isWhatsapp
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                              : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {contactInfo.isWhatsapp ? (
                            <MessageCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Phone className="w-3.5 h-3.5" />
                          )}
                          <span>{contactInfo.label}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-2 text-center border-t border-white/5">
            <p className="text-[10px] text-stone-500 font-mono">
              {language === 'bm'
                ? 'Iklan dihantar oleh pengguna akan dipaparkan secara langsung. Sila berwaspada semasa membuat sebarang urusan kewangan.'
                : 'User postings are updated dynamically in real-time. Exercise normal caution during transactions.'}
            </p>
          </div>
        </div>
      </div>

      {/* Built-In Post New Classified Modal */}
      {showPostModal && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowPostModal(false)}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-3xl p-5 sm:p-6 bg-stone-900 border border-emerald-500/40 shadow-2xl relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPostModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              aria-label="Close post classified modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-100">
                  {language === 'bm' ? 'Terbitkan Iklan Baru' : 'Post New Classified Listing'}
                </h3>
                <p className="text-[11px] text-stone-400">
                  {language === 'bm'
                    ? 'Disiarkan terus ke papan komuniti Cameron Highlands'
                    : 'Publishes immediately to the live highland community board'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitClassified} className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 block mb-1 font-bold">
                  {language === 'bm' ? 'Tajuk Iklan *' : 'Listing Title *'}
                </label>
                <input
                  required
                  type="text"
                  placeholder={
                    language === 'bm'
                      ? 'cth. Pemandu Pelancong / Tukang Masak / Barang Terpakai'
                      : 'e.g. Part-Time Barista, Tour Guide, or Scooters for Sale'
                  }
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1 font-bold">
                    {language === 'bm' ? 'Kategori' : 'Category / Type'}
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none cursor-pointer"
                  >
                    <option value="Job Offer">Job Offer</option>
                    <option value="Job Wanted">Job Wanted</option>
                    <option value="Interview">Interview</option>
                    <option value="Service Offered">Service Offered</option>
                    <option value="Service Wanted">Service Wanted</option>
                    <option value="Item For Sale">Item For Sale</option>
                    <option value="Item Wanted">Item Wanted</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 block mb-1 font-bold">
                    {language === 'bm' ? 'Pekan' : 'Township Hub'}
                  </label>
                  <select
                    value={postTownship}
                    onChange={(e) => setPostTownship(e.target.value as Township)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none cursor-pointer"
                  >
                    {TOWNSHIPS_LIST.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1 font-bold">
                    {language === 'bm' ? 'Syarikat / Nama Pengiklan' : 'Company / Poster Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Highland Tea Cafe"
                    value={postCompany}
                    onChange={(e) => setPostCompany(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1 font-bold">
                    {language === 'bm' ? 'Gaji / Harga' : 'Salary / Price Tag'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RM 2,200 / month"
                    value={postSalary}
                    onChange={(e) => setPostSalary(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-bold">
                  {language === 'bm' ? 'Huraian Penuh *' : 'Description *'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    language === 'bm'
                      ? 'Nyatakan butiran kerja, waktu operasi, syarat atau keadaan barang...'
                      : 'Describe role details, schedule, requirements, or item condition...'
                  }
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-bold">
                  {language === 'bm' ? 'No. WhatsApp / Telefon / Emel *' : 'Contact Info (WhatsApp / Phone / Email) *'}
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. +60 12-345 6789 or email@domain.com"
                  value={postContact}
                  onChange={(e) => setPostContact(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-800 border border-white/10 focus:border-emerald-500 text-stone-100 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold cursor-pointer"
                >
                  {language === 'bm' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{language === 'bm' ? 'Terbitkan Iklan' : 'Publish Listing'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
