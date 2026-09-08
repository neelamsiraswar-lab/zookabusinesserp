import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  Trash2, 
  Sparkles,
  Info,
  Package,
  FileSpreadsheet,
  ReceiptText
} from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useApp } from '../../context/AppContext';
import { PwaInstallModal } from '../pwa/PwaInstallModal';

export const PwaSettingsTab: React.FC = () => {
  const { isInstalled, isInstallable, isOnline, platform, storageInfo, canPromptNative, installPwa } = usePWA();
  const { showToast } = useApp();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      showToast('success', 'Cache Cleared', 'Application cache has been cleared. Reloading with fresh assets...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      showToast('error', 'Error', 'Failed to clear application caches.');
      setIsClearingCache(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
            <Smartphone className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg md:text-xl font-black tracking-tight text-white">
                Progressive Web App (PWA) Engine
              </h3>
              <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                isInstalled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-indigo-500/20 text-cyan-300 border-indigo-500/40'
              }`}>
                {isInstalled ? 'APP INSTALLED' : 'BROWSER MODE'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
                <span>{isOnline ? 'Online Connected' : 'Offline Mode Active'}</span>
              </span>
            </div>
            <p className="text-xs md:text-sm text-indigo-200/80 max-w-2xl">
              Install Zooka ERP as a native standalone application on Windows, macOS, Android, and iOS for offline billing, faster startups, and hardware printer integration.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install PWA App</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/15 cursor-pointer disabled:opacity-50"
            title="Purge Service Worker cached files and reload fresh assets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
            <span>{isClearingCache ? 'Clearing...' : 'Clear App Cache'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Diagnostics & Capability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: App Status & Installation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Installation Status</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Environment & Window Mode</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300">Display Mode:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {isInstalled ? 'Standalone Window' : 'Web Browser Tab'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300">Target Platform:</span>
              <span className="font-bold uppercase text-slate-900 dark:text-white">
                {platform}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300">Service Worker:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active (v1.1.0)</span>
              </span>
            </div>
          </div>

          {!isInstalled && (
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Launch Install Prompt</span>
            </button>
          )}
        </div>

        {/* Card 2: Offline Data Storage & Storage Quota */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Local Offline Storage</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Cache storage & local partitions</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Cached Data Volume:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {storageInfo ? `${storageInfo.usageMB} MB` : 'Calculating...'}
                </span>
              </div>
              {storageInfo && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(3, storageInfo.percentUsed)}%` }}
                  />
                </div>
              )}
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Quota: {storageInfo ? `${storageInfo.quotaMB} MB` : '50+ GB'}</span>
                <span>{storageInfo ? `${storageInfo.percentUsed}% used` : '<1% used'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Multi-Entity Offline Partitioning</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Invoices, products, customers, and payment entries are isolated per company and retained offline for zero-latency operations.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: App Shortcuts & Hardware Integration */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">PWA Quick Shortcuts</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Right-click & long-press actions</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <ReceiptText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white">New Invoice Creation</div>
                <div className="text-[10px] text-slate-400">Directly jump into invoice generator</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white">POS Billing Counter</div>
                <div className="text-[10px] text-slate-400">Rapid barcode & touch screen register</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <Package className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white">Inventory & Stock Tracking</div>
                <div className="text-[10px] text-slate-400">Check depot quantities and alerts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PWA Install Modal */}
      <PwaInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};
