import React from 'react';
import {
  CloudSun,
  MapPin,
  Camera,
  MessageSquare,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';

interface MobileFooterNavProps {
  language: Language;
  onNavigateSection: (sectionId: string) => void;
  onOpenDirectoriesModal: () => void;
  onOpenPortalsModal: () => void;
  onOpenAi: () => void;
  onOpenChat: () => void;
  setActiveCapsuleModal: (modal: any) => void;
  onNavigateHome: () => void;
  hasNewChat?: boolean;
}

export const MobileFooterNav: React.FC<MobileFooterNavProps> = ({
  language,
  onNavigateSection,
  onOpenDirectoriesModal,
  onOpenPortalsModal,
  onOpenAi,
  onOpenChat,
  setActiveCapsuleModal,
  onNavigateHome,
  hasNewChat,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-stone-900/95 backdrop-blur-xl border-t border-white/10 p-1.5 flex justify-around items-center gap-1 shadow-2xl">
      <button onClick={onNavigateHome} className="flex flex-col items-center justify-center gap-0.5 p-1.5 text-stone-300 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95">
        <Compass className="w-5 h-5" />
        <span className="text-[10px] font-medium">Home</span>
      </button>
      <button onClick={onOpenDirectoriesModal} className="flex flex-col items-center justify-center gap-0.5 p-1.5 text-emerald-400 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95">
        <Compass className="w-5 h-5" />
        <span className="text-[10px] font-medium">Dir</span>
      </button>
      <button onClick={onOpenPortalsModal} className="flex flex-col items-center justify-center gap-0.5 p-1.5 text-teal-400 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95">
        <Layers className="w-5 h-5" />
        <span className="text-[10px] font-medium">Hub</span>
      </button>
      <button onClick={() => onNavigateSection('interactive-map')} className="flex flex-col items-center justify-center gap-0.5 p-1.5 text-stone-300 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95">
        <MapPin className="w-5 h-5" />
        <span className="text-[10px] font-medium">Map</span>
      </button>
      <button onClick={() => onNavigateSection('interactive-gallery')} className="flex flex-col items-center justify-center gap-0.5 p-1.5 text-stone-300 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95">
        <Camera className="w-5 h-5" />
        <span className="text-[10px] font-medium">Gallery</span>
      </button>
      <button onClick={onOpenChat} className={`flex flex-col items-center justify-center gap-0.5 p-1.5 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95 ${hasNewChat ? 'text-emerald-400 animate-pulse' : 'text-stone-300'}`}>
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] font-medium">Chat</span>
      </button>
      <button onClick={onOpenAi} className="flex flex-col items-center justify-center gap-0.5 p-1.5 text-sky-400 min-h-[44px] min-w-[44px] cursor-pointer active:scale-95">
        <Sparkles className="w-5 h-5" />
        <span className="text-[10px] font-medium">AI</span>
      </button>
    </div>
  );
};
