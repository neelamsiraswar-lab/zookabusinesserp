import React, { useState } from 'react';
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  WifiOff, 
  Zap, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers
} from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, isInstallable, platform, installPwa, canPromptNative } = usePWA();
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (canPromptNative) {
      setInstallStatus('installing');
      const result = await installPwa();
      if (result === 'accepted') {
        setInstallStatus('success');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setInstallStatus('dismissed');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn overflow-y-auto modal-overlay">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-[96vw] sm:max-w-md md:max-w-lg w-full max-h-[95dvh] sm:max-h-[90dvh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-4 sm:p-6 text-white overflow-hidden shrink-0">
          {/* Background Ambient Glow */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 pr-8">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white p-1.5 sm:p-2 shadow-lg ring-4 ring-white/10 flex items-center justify-center shrink-0">
              <img src="/favicon.svg" alt="Zooka Business" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-xl font-black tracking-tight text-white truncate">Install Zooka Business</h3>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  PWA Ready
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-100/90 mt-0.5 truncate">
                Enterprise GST Accounting, POS Billing & Offline Engine
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto modal-content-scroll">
          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-cyan-400 font-bold text-xs">
                <WifiOff className="w-4 h-4" />
                <span>100% Offline Mode</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Create invoices & POS bills anytime. Auto-syncs when online.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Zap className="w-4 h-4" />
                <span>Instant Launch</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Zero load delay with precached assets and hardware speed.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <Monitor className="w-4 h-4" />
                <span>Dedicated Window</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Runs cleanly without browser address bars or tab clutters.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypted & Safe</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Protected with role-based PIN access and audit logging.
              </p>
            </div>
          </div>

          {/* Platform-Specific Step Guides */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                App Already Installed & Running
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/90">
                You are utilizing Zooka Business in native standalone app mode with offline storage enabled.
              </p>
            </div>
          ) : platform === 'ios' ? (
            /* iOS Safari Instructions */
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>How to Install on iPhone / iPad (Safari)</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="flex-1">
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-600 dark:text-cyan-400" /> at the bottom or top bar of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="flex-1">
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-indigo-600 dark:text-cyan-400" />.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div className="flex-1">
                    Tap <strong>Add</strong> in the top-right corner to place the app on your home screen.
                  </div>
                </div>
              </div>
            </div>
          ) : canPromptNative ? (
            /* Chrome / Edge / Android Native 1-Click Install */
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Click below to install Zooka ERP directly to your application menu and home screen with a single click.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installStatus === 'installing'}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{installStatus === 'installing' ? 'Installing App...' : 'Install Application Now'}</span>
              </button>
            </div>
          ) : (
            /* Desktop Browser Manual Instructions (e.g. Chrome / Edge address bar icon) */
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Monitor className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                <span>Browser Installation Guide</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                In your browser address bar (Chrome, Edge, Brave), click the <strong>Install App icon (⊕)</strong> or open browser menu <strong>(⋮) → Cast, save, and share → Install Zooka Business</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Version: PWA v1.1 • Offline Ready</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
