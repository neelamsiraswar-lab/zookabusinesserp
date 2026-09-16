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
import { DesktopModal } from '../common/DesktopModal';

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
    <DesktopModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Install Zooka Business"
      badge={
        <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full">
          PWA Ready
        </span>
      }
      subtitle="Enterprise GST Accounting, POS Billing & Offline Engine"
      icon={<Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      iconBgColor="bg-indigo-50 dark:bg-indigo-950/70"
      bodyClassName="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1"
      footer={
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 w-full">
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
      }
    >
      <div className="space-y-4 sm:space-y-5">
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
    </DesktopModal>
  );
};
