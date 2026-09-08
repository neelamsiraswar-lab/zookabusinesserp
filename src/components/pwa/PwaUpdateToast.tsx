import React, { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const PwaUpdateToast: React.FC = () => {
  const { isUpdateAvailable, applyUpdate } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isUpdateAvailable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm animate-fadeIn">
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/50 flex items-start gap-3 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
            App Update Available
          </h4>
          <p className="text-xs text-slate-300 mt-1">
            A new version of Zooka Business is ready with improvements.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={applyUpdate}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update Now</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
