import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, ExternalLink, ArrowUpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CloudSyncStatusBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { 
    cloudSyncStatus, 
    lastCloudSyncTime, 
    triggerCloudSync, 
    refreshData, 
    isCloudSyncing,
    isCloudQuotaExceeded,
    firestoreUpgradeUrl 
  } = useApp();

  if (compact) {
    return (
      <button
        onClick={() => refreshData(true)}
        disabled={isCloudSyncing}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 disabled:opacity-50"
        title={
          isCloudQuotaExceeded 
            ? 'Cloud Write Quota Limit Reached • All invoices 100% saved locally • Click to refresh'
            : lastCloudSyncTime 
              ? `Realtime Cloud Firestore Connected • Last synced ${lastCloudSyncTime.toLocaleTimeString()}` 
              : 'Google Cloud Firestore Live Connected • Click to Refresh'
        }
        aria-label="Cloud Firestore Sync Status and Refresh"
      >
        {isCloudSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
        ) : isCloudQuotaExceeded ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        ) : cloudSyncStatus === 'online' ? (
          <div className="relative flex items-center justify-center">
            <Cloud className="w-3.5 h-3.5 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
        ) : cloudSyncStatus === 'error' ? (
          <CloudOff className="w-3.5 h-3.5 text-rose-500" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span className="hidden sm:inline">
          {isCloudSyncing ? 'Syncing...' : isCloudQuotaExceeded ? 'Local Safe (Quota)' : cloudSyncStatus === 'online' ? 'Live Sync' : 'Offline'}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/20 to-emerald-50/20 dark:from-slate-800/70 dark:via-indigo-950/20 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isCloudQuotaExceeded
              ? 'bg-amber-100/80 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
              : cloudSyncStatus === 'online'
                ? 'bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-100/70 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
          }`}>
            {isCloudQuotaExceeded ? (
              <AlertTriangle className="w-5 h-5" />
            ) : cloudSyncStatus === 'online' ? (
              <Cloud className="w-5 h-5" />
            ) : (
              <CloudOff className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Google Cloud Firestore DB
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isCloudQuotaExceeded
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                  : cloudSyncStatus === 'online'
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
              }`}>
                {cloudSyncStatus === 'online' && !isCloudQuotaExceeded && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {isCloudQuotaExceeded ? 'Daily Quota Limit • Local Safe' : cloudSyncStatus === 'online' ? 'Realtime Connected' : 'Offline / Error'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isCloudQuotaExceeded
                ? 'Local cache active. All invoices are safely stored on device. Daily free write units reset automatically every 24h.'
                : lastCloudSyncTime 
                  ? `Realtime sync active • Last updated at ${lastCloudSyncTime.toLocaleTimeString()}`
                  : 'Continuous bidirectional synchronization with Firestore database'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isCloudQuotaExceeded && (
            <a
              href={firestoreUpgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
              title="Upgrade Firebase project for unlimited writes"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Upgrade DB</span>
            </a>
          )}

          <button
            onClick={() => refreshData(true)}
            disabled={isCloudSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Fetch latest updates from Cloud DB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{isCloudSyncing ? 'Refreshing...' : 'Refresh DB'}</span>
          </button>

          <button
            onClick={() => triggerCloudSync(true)}
            disabled={isCloudSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Force push all local data to Cloud Firestore"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
