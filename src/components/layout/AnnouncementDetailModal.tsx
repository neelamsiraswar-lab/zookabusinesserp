import React from 'react';
import { 
  X, 
  Sparkles, 
  Bell, 
  AlertTriangle, 
  Wrench, 
  ArrowRight, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';
import { PlatformAnnouncement } from '../../types';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: PlatformAnnouncement;
  onAction?: () => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onAction,
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    feature: {
      icon: Sparkles,
      badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      heroBg: 'from-purple-900/30 to-indigo-950/40 border-purple-800/40',
      actionBtn: 'bg-purple-600 hover:bg-purple-500 text-white',
    },
    info: {
      icon: Bell,
      badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      heroBg: 'from-blue-900/30 to-indigo-950/40 border-blue-800/40',
      actionBtn: 'bg-blue-600 hover:bg-blue-500 text-white',
    },
    alert: {
      icon: AlertTriangle,
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      heroBg: 'from-amber-900/30 to-red-950/40 border-amber-800/40',
      actionBtn: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    maintenance: {
      icon: Wrench,
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      heroBg: 'from-emerald-900/30 to-teal-950/40 border-emerald-800/40',
      actionBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
  }[announcement.type || 'feature'];

  const Icon = typeConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 bg-gradient-to-br ${typeConfig.heroBg} border-b flex items-start justify-between gap-4`}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${typeConfig.badgeBg}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{announcement.badgeText || 'Announcement'}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(announcement.publishedAt || Date.now()).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
              {announcement.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <p className="font-medium text-slate-800 dark:text-slate-200 text-base">
            {announcement.message}
          </p>

          {announcement.learnMoreContent && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs sm:text-sm whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">
              {announcement.learnMoreContent}
            </div>
          )}

          <div className="pt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Broadcasted platform-wide by Super Administration to all business organizations.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Close
          </button>
          {announcement.actionLabel && onAction && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${typeConfig.actionBtn}`}
            >
              <span>{announcement.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
