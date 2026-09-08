import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bell, 
  AlertTriangle, 
  Wrench, 
  X, 
  ArrowRight, 
  Info,
  Crown,
  ExternalLink 
} from 'lucide-react';
import { PlatformAnnouncement, AppUser } from '../../types';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';

interface AnnouncementBannerProps {
  announcement?: PlatformAnnouncement | null;
  currentUser?: AppUser | null;
  onNavigateTab?: (tab: any) => void;
  onOpenSuperAdminPortal?: () => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  currentUser,
  onNavigateTab,
  onOpenSuperAdminPortal,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Check dismissal key tied to announcement id and timestamp
  useEffect(() => {
    if (!announcement?.id) return;
    try {
      const dismissKey = `zooka_announcement_dismiss_${announcement.id}_${announcement.updatedAt || 'v1'}`;
      const legacyDismissKey = `vyapar_announcement_dismiss_${announcement.id}_${announcement.updatedAt || 'v1'}`;
      const dismissed = localStorage.getItem(dismissKey) === 'true' || localStorage.getItem(legacyDismissKey) === 'true';
      setIsDismissed(dismissed);
    } catch (e) {
      setIsDismissed(false);
    }
  }, [announcement?.id, announcement?.updatedAt]);

  if (!announcement || announcement.enabled === false) {
    return null;
  }

  // Audience check
  if (announcement.targetAudience === 'ADMINS_ONLY') {
    const isPrivileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isPrivileged) return null;
  }

  // If dismissed and not in super admin role
  if (isDismissed && currentUser?.role !== 'SUPER_ADMIN') {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      const dismissKey = `zooka_announcement_dismiss_${announcement.id}_${announcement.updatedAt || 'v1'}`;
      localStorage.setItem(dismissKey, 'true');
    } catch (e) {}
  };

  const handleAction = () => {
    if (announcement.actionTab && onNavigateTab) {
      onNavigateTab(announcement.actionTab);
    } else if (announcement.actionUrl) {
      if (announcement.actionUrl.startsWith('http')) {
        window.open(announcement.actionUrl, '_blank', 'noopener,noreferrer');
      } else if (onNavigateTab) {
        onNavigateTab(announcement.actionUrl);
      }
    } else {
      setIsDetailModalOpen(true);
    }
  };

  const typeConfig = {
    feature: {
      icon: Sparkles,
      container: 'bg-indigo-950/90 border-indigo-700/60 text-indigo-100',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      btn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs',
      iconColor: 'text-indigo-400',
      accentDot: 'bg-indigo-400',
    },
    info: {
      icon: Bell,
      container: 'bg-blue-950/90 border-blue-700/60 text-blue-100',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs',
      iconColor: 'text-blue-400',
      accentDot: 'bg-blue-400',
    },
    alert: {
      icon: AlertTriangle,
      container: 'bg-amber-950/90 border-amber-700/60 text-amber-100',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs',
      iconColor: 'text-amber-400',
      accentDot: 'bg-amber-400',
    },
    maintenance: {
      icon: Wrench,
      container: 'bg-emerald-950/90 border-emerald-700/60 text-emerald-100',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs',
      iconColor: 'text-emerald-400',
      accentDot: 'bg-emerald-400',
    },
  }[announcement.type || 'feature'];

  const IconComponent = typeConfig.icon;

  return (
    <>
      <div 
        className={`w-full border-b backdrop-blur-md transition-all animate-fadeIn ${typeConfig.container} shadow-xs z-10`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Left Content Area: Icon, Badge, Title & Short Text */}
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-white/10 shrink-0 mt-0.5 sm:mt-0">
              <IconComponent className={`w-4 h-4 ${typeConfig.iconColor}`} />
            </div>

            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-extrabold uppercase tracking-wide border shrink-0 ${typeConfig.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.accentDot} animate-pulse`} />
                <span>{announcement.badgeText || 'New Feature'}</span>
              </span>

              <span className="font-bold text-xs sm:text-sm text-white truncate max-w-full">
                {announcement.title}
              </span>

              <span className="hidden lg:inline text-slate-400 text-xs">•</span>

              <span className="text-xs text-slate-300 line-clamp-1 max-w-xl font-normal">
                {announcement.message}
              </span>

              {announcement.learnMoreContent && (
                <button
                  onClick={() => setIsDetailModalOpen(true)}
                  className="text-xs text-indigo-300 hover:text-white underline font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Learn more
                </button>
              )}
            </div>
          </div>

          {/* Right Action & Dismiss Controls */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {/* Super Admin Quick Edit Link */}
            {currentUser?.role === 'SUPER_ADMIN' && onOpenSuperAdminPortal && (
              <button
                onClick={onOpenSuperAdminPortal}
                className="px-2 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-[11px] font-bold text-purple-200 border border-purple-700/50 flex items-center gap-1 transition-all cursor-pointer"
                title="Manage or edit this announcement banner from Super Admin Portal"
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span className="hidden sm:inline">Edit Banner</span>
              </button>
            )}

            {/* Main Action Button */}
            {announcement.actionLabel && (
              <button
                onClick={handleAction}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${typeConfig.btn}`}
              >
                <span>{announcement.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dismiss Button */}
            {announcement.dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss announcement banner"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Learn More Detail Modal */}
      <AnnouncementDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        announcement={announcement}
        onAction={handleAction}
      />
    </>
  );
};
