import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ToastMessage } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const duration = toast.duration ?? 5000;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        onRemove(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, duration, onRemove]);

  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />;
  let cardClass = 'border-emerald-200/80 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-emerald-500/10 ring-1 ring-emerald-500/20';
  let barColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';

  if (toast.type === 'error') {
    icon = <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />;
    cardClass = 'border-rose-200/80 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-rose-500/10 ring-1 ring-rose-500/20';
    barColor = 'bg-rose-500';
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300';
  } else if (toast.type === 'warning') {
    icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
    cardClass = 'border-amber-200/80 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-amber-500/10 ring-1 ring-amber-500/20';
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';
  } else if (toast.type === 'info') {
    icon = <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
    cardClass = 'border-blue-200/80 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-blue-500/10 ring-1 ring-blue-500/20';
    barColor = 'bg-blue-500';
    badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300';
  }

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden flex flex-col rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${cardClass}`}
    >
      <div className="flex items-start gap-3 p-3.5">
        {icon}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-xs uppercase tracking-wider truncate">{toast.title}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${badgeColor}`}>
              {toast.type}
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {toast.message}
          </div>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 5-Second Animated Progress Bar */}
      {duration > 0 && (
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all ease-linear`}
            style={{ width: `${progress}%`, transitionDuration: '50ms' }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </aside>
  );
};
