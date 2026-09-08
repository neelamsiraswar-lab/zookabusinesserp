import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, X, Database } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const OfflineIndicatorBanner: React.FC = () => {
  const { isOnline } = usePWA();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsDismissed(false);
    } else if (wasOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  if (!isOnline && isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-md animate-bounce-short">
      {!isOnline ? (
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-amber-500/40 flex items-start gap-3 relative overflow-hidden backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Offline Mode Active
              </h4>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              You are working offline. Invoices, POS orders, and stock updates continue saving to local storage and will automatically synchronize when you reconnect.
            </p>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Dismiss offline banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-emerald-900/90 text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-emerald-500/40 flex items-center gap-3 backdrop-blur-md animate-fadeIn">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Connection Restored
            </h4>
            <p className="text-xs text-emerald-100 mt-0.5">
              Online! All local transactions are being synced to Cloud Firestore.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
