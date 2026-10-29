import React from 'react';
import { CamLogo } from './CamLogo';
import { Language, Township } from '../types';
import { MapPin, ExternalLink, Github, Database, Share2 } from 'lucide-react';

interface FooterProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSelectTown: (town: Township) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  onLanguageChange,
  onSelectTown,
  onOpenAdmin,
}) => {
  const towns: Township[] = [
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

  // Editable social media URLs - replace these placeholders with real profile links later!
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://facebook.com', // EDIT ME: Replace with real Facebook page URL
      icon: (
        <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      handle: '@CamGoCameron',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com', // EDIT ME: Replace with real Instagram profile URL
      icon: (
        <svg className="w-4 h-4 text-pink-500 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      handle: '@camgo_highlands',
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com', // EDIT ME: Replace with real TikTok profile URL
      icon: (
        <svg className="w-4 h-4 text-cyan-400 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.28 1.56-1.22 2.56.03.88.48 1.72 1.2 2.21.84.58 1.95.66 2.85.22.82-.39 1.43-1.18 1.56-2.08.08-1.55.04-3.11.05-4.66.01-4.34.01-8.68 0-13.02z" />
        </svg>
      ),
      handle: '@camgocameron',
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com', // EDIT ME: Replace with real YouTube channel URL
      icon: (
        <svg className="w-4 h-4 text-rose-500 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      handle: 'CamGo Official',
    },
  ];

  return (
    <footer className="mt-24 border-t border-white/10 bg-stone-950 text-stone-300 relative overflow-hidden">
      {/* Mountain Background Gradient Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-emerald-950/20 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 relative z-10 space-y-12">
        {/* Main 4-column footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <CamLogo size="lg" variant="light" showTagline={true} />
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-sm mt-3">
              {language === 'bm'
                ? 'Portal panduan langsung dan direktori pintar Cameron Highlands. Ramalan cuaca mikro, amaran trafik masa nyata, peta satelit interaktif, dan sembang komuniti.'
                : 'The official-grade live travel companion for Cameron Highlands. Live weather microclimates, real-time traffic choke point alerts, satellite navigator, and verified directories.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                1,440m - 2,032m ASL
              </span>
              <span className="px-3 py-1 rounded-full bg-stone-900 text-stone-400 border border-white/10 text-xs">
                Pahang Darul Makmur
              </span>
            </div>
          </div>

          {/* 1. Highlands Townships (Visible on tablet/desktop) */}
          <div className="hidden md:block">
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{language === 'bm' ? 'Pekan Tanah Tinggi' : 'Highland Townships'}</span>
            </h4>
            <ul className="space-y-1.5 text-xs">
              {towns.map((town) => (
                <li key={town}>
                  <button
                    onClick={() => onSelectTown(town)}
                    className="text-stone-400 hover:text-emerald-400 hover:translate-x-1 transition-all cursor-pointer text-left"
                  >
                    {town}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Official Portals (Switched to be placed next to Highland Townships) */}
          <div className="hidden md:block">
            <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{language === 'bm' ? 'Pautan Rasmi' : 'Official Portals'}</span>
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <a
                  href="https://mdcameron.gov.my"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Majlis Daerah (MDCH)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://pahangtourism.org.my"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Tourism Pahang</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://jkr.gov.my"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>JKR Pahang Road Status</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenAdmin}
                  className="hover:text-emerald-300 flex items-center gap-1 text-left cursor-pointer"
                >
                  <span>Admin Access Portal</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 3. Follow Us Social Links (Replaced Emergency Hotlines) */}
          <div className="hidden md:block">
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>{language === 'bm' ? 'Ikuti Kami' : 'Follow Us'}</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              {socialLinks.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-900/80 border border-white/5 hover:border-emerald-500/40 hover:bg-stone-800/80 transition-all group"
                  >
                    <div className="shrink-0">{social.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-200 group-hover:text-emerald-300 text-[11px]">
                        {social.name}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        {social.handle}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-3">
            <span>© 2026 CamGo - Explore the Highlands. All rights reserved.</span>
          </div>

          {/* GitHub & Firebase Ready Badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 border border-white/10 text-[11px] text-stone-400">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Firebase Connected</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 border border-white/10 text-[11px] text-stone-400">
              <Github className="w-3 h-3 text-stone-300" />
              <span>GitHub Portable</span>
            </span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLanguageChange('en')}
              className={`hover:text-white cursor-pointer ${
                language === 'en' ? 'text-emerald-400 font-bold' : ''
              }`}
            >
              English
            </button>
            <span>•</span>
            <button
              onClick={() => onLanguageChange('bm')}
              className={`hover:text-white cursor-pointer ${
                language === 'bm' ? 'text-emerald-400 font-bold' : ''
              }`}
            >
              Bahasa Malaysia
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
