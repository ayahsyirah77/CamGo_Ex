import React, { useState } from 'react';
import { Download, Home, CheckCircle2, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface ModulePwaControlsProps {
  moduleName: 'trails' | 'party';
  language: Language;
  onNavigateMainPage?: () => void;
}

export const ModulePwaControls: React.FC<ModulePwaControlsProps> = ({
  moduleName,
  language,
  onNavigateMainPage,
}) => {
  const { isStandalone, isIOS, hasPrompt, installPWA } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const isBm = language === 'bm';

  const appLabel =
    moduleName === 'trails'
      ? isBm
        ? 'Pasang Trails'
        : 'Install Trails App'
      : isBm
        ? 'Pasang Party'
        : 'Install Party App';

  const handleInstall = async () => {
    if (hasPrompt) {
      const res = await installPWA();
      if (res.success) {
        setInstallSuccess(true);
        return;
      }
    }
    setShowInstructions(true);
  };

  return (
    <div className="relative flex items-center gap-1.5 shrink-0">
      {!isStandalone && !installSuccess && (
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10.5px] sm:text-[11px] font-bold shadow-sm transition-colors min-h-[36px] cursor-pointer"
          title={appLabel}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{appLabel}</span>
          <span className="sm:hidden">{isBm ? 'Pasang' : 'Install'}</span>
        </button>
      )}

      {(isStandalone || installSuccess) && (
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
          <CheckCircle2 className="w-3 h-3" />
          {isBm ? 'Mod Aplikasi' : 'Standalone'}
        </span>
      )}

      {onNavigateMainPage && (
        <button
          type="button"
          onClick={onNavigateMainPage}
          className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 text-[11px] font-semibold transition-colors min-h-[36px] min-w-[36px] cursor-pointer"
          title={isBm ? 'Kembali ke Laman Utama CamGo' : 'Return to CamGo Main Page'}
          aria-label={isBm ? 'Laman Utama CamGo' : 'Return to CamGo Main Page'}
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{isBm ? 'Utama' : 'Main Page'}</span>
        </button>
      )}

      {showInstructions && (
        <div className="fixed inset-0 z-[10050] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-700 p-5 text-stone-100 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">
                {moduleName === 'trails'
                  ? isBm
                    ? 'Pasang Aplikasi CamGo Highland Trails'
                    : 'Install CamGo Highland Trails App'
                  : isBm
                    ? 'Pasang Aplikasi CamGo Find My Party'
                    : 'Install CamGo Find My Party App'}
              </h4>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              {isIOS ? (
                <>
                  {isBm
                    ? 'Pada Safari iOS, ketik ikon Kongsi '
                    : 'On iOS Safari, tap the Share button '}
                  <Share className="w-3.5 h-3.5 inline mx-0.5 text-cyan-400" />
                  {isBm
                    ? ' di bahagian bawah dan pilih "Tambah ke Skrin Utama" ("Add to Home Screen") untuk melancarkan terus ke skrin ini.'
                    : ' at the bottom and choose "Add to Home Screen" to launch directly into this screen.'}
                </>
              ) : isBm ? (
                'Buka menu pelayar (⋮) di penjuru kanan atas dan pilih "Pasang aplikasi" atau "Tambah ke skrin utama" untuk pintasan skrin penuh.'
              ) : (
                'Open your browser menu (⋮) in the top right and select "Install app" or "Add to Home screen" for a dedicated standalone shortcut.'
              )}
            </p>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              {isBm ? 'Faham' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
