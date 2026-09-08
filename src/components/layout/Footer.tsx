import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Lock, 
  Award, 
  Server, 
  Zap, 
  CheckCircle2, 
  ArrowUp, 
  Heart,
  Crown,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { normalizeFooterConfig, interpolateFooterText } from '../../utils/footerDefaults';
import { FooterDensity, FooterStyle } from '../../types';
import { getAccentBg, getAccentText } from '../../utils/themeColors';

export const Footer: React.FC = () => {
  const { 
    business, 
    currentCompany, 
    setActiveTab, 
    currentUser,
    users,
    openAuthModal,
    cloudSyncStatus, 
    lastCloudSyncTime 
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const config = normalizeFooterConfig(business.footerConfig || currentCompany?.footerConfig);

  if (config.enabled === false) {
    return null;
  }

  // Branding dynamic values
  const activeCompName = config.customBrandName || currentCompany?.tradeName || currentCompany?.name || business.tradeName || business.name || 'Zooka Business Enterprise';
  const activeLegalName = currentCompany?.name || business.name || activeCompName;
  const activeGstin = currentCompany?.gstin || business.gstin || '27AAAAA0000A1Z5';
  const activeState = currentCompany?.state || business.state || 'Maharashtra';
  const activeCity = currentCompany?.city || business.city || 'Mumbai';
  const activeFy = currentCompany?.financialYear || '2026-2027';
  const activePhone = config.customPhone || currentCompany?.phone || business.phone || '+91 98000 00000';
  const activeEmail = config.customEmail || currentCompany?.email || business.email || 'support@zookabusiness.in';
  const activeAddress = config.customAddress || currentCompany?.address || business.address || `${activeCity}, ${activeState}`;

  const currentYear = new Date().getFullYear();

  const renderedCopyright = interpolateFooterText(config.copyrightText || '© {year} {companyName}. All rights reserved.', {
    year: currentYear,
    companyName: activeCompName,
    gstin: activeGstin,
    state: activeState,
    city: activeCity,
    fy: activeFy
  });

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };


  const getDensityClasses = (density: FooterDensity) => {
    switch (density) {
      case 'COMPACT': return 'py-4 px-4 sm:px-6';
      case 'SPACIOUS': return 'py-10 px-6 sm:px-10';
      default: return 'py-7 px-4 sm:px-8'; // COMFORTABLE
    }
  };

  const getFooterStyleClasses = (style: FooterStyle) => {
    switch (style) {
      case 'MINIMAL':
        return 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-t border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400';
      case 'FLOATING':
        return 'bg-white/95 dark:bg-slate-900/95 mx-3 sm:mx-6 my-4 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-xl backdrop-blur-md text-slate-700 dark:text-slate-300';
      case 'GRADIENT':
        return 'bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-900 border-t border-indigo-100/60 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300';
      case 'MODERN_CARD':
        return 'bg-slate-50/90 dark:bg-slate-900/90 border-t-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
      case 'DETAILED':
        return 'bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
      default: // CLASSIC
        return 'bg-white dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800/90 text-slate-600 dark:text-slate-400';
    }
  };

  const getShadowClass = (shadow: string) => {
    switch (shadow) {
      case 'xs': return 'shadow-xs';
      case 'sm': return 'shadow-sm';
      case 'md': return 'shadow-md';
      case 'lg': return 'shadow-lg';
      default: return '';
    }
  };

  const renderBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'lock': return <Lock className="w-3 h-3 text-emerald-500 shrink-0" />;
      case 'award': return <Award className="w-3 h-3 text-amber-500 shrink-0" />;
      case 'server': return <Server className="w-3 h-3 text-indigo-500 shrink-0" />;
      case 'zap': return <Zap className="w-3 h-3 text-cyan-500 shrink-0" />;
      case 'check': return <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />;
      default: return <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />;
    }
  };

  // If style is minimal, render single clean bar
  if (config.style === 'MINIMAL') {
    return (
      <footer className={`print:hidden w-full transition-all duration-200 ${getDensityClasses(config.density)} ${getFooterStyleClasses(config.style)} ${getShadowClass(config.shadow)}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {renderedCopyright}
            </span>
            {config.showVersion && config.versionText && (
              <>
                <span className="opacity-30">•</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {config.versionText}
                </span>
              </>
            )}
            {config.showMadeWithLove && (
              <>
                <span className="opacity-30 hidden md:inline">•</span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Engineered with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> in India
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {config.showCloudSyncStatus && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Synced</span>
              </div>
            )}
            {config.showScrollToTop && (
              <button
                onClick={scrollToTop}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Scroll to Top"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>
    );
  }

  const enabledBadges = config.badges ? config.badges.filter(b => b.isEnabled) : [];
  const enabledQuickLinks = config.quickLinks ? config.quickLinks.filter(l => l.isEnabled) : [];

  return (
    <footer className={`print:hidden w-full transition-all duration-200 ${getDensityClasses(config.density)} ${getFooterStyleClasses(config.style)} ${getShadowClass(config.shadow)}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Grid: Multi-column Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Col 1: Brand & Compliance Info */}
          <div className="space-y-3">
            {config.showBranding && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${getAccentBg(config.customAccentColor)} flex items-center justify-center font-bold text-xs shadow-2xs`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                    {activeCompName}
                  </h3>
                </div>
                {activeLegalName && activeLegalName !== activeCompName && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Entity: {activeLegalName}
                  </p>
                )}
                {config.customTagline && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {config.customTagline}
                  </p>
                )}
              </div>
            )}

            {/* GSTIN & State Code Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {config.showGstin && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${getAccentText(config.customAccentColor)}`}>
                  GSTIN: {activeGstin}
                </span>
              )}
              {config.showStateCode && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  State Code: {activeGstin ? activeGstin.substring(0, 2) : '27'}
                </span>
              )}
              {config.showFinancialYear && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  FY {activeFy}
                </span>
              )}
            </div>
          </div>

          {/* Col 2: Quick Navigation Links */}
          {config.showQuickLinks && enabledQuickLinks.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>{config.quickLinksTitle || 'Quick Navigation'}</span>
              </h4>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                {enabledQuickLinks.map(link => (
                  <li key={link.id}>
                    <button
                      onClick={() => setActiveTab(link.tabId as any)}
                      className="text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium transition-colors text-left truncate w-full flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 3: Contact & Business Support Details */}
          {config.showContactInfo && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Support & Contact</span>
              </h4>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {config.showPhone && activePhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${activePhone}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
                      {activePhone}
                    </a>
                  </div>
                )}
                {config.showEmail && activeEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`mailto:${activeEmail}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate">
                      {activeEmail}
                    </a>
                  </div>
                )}
                {config.showAddress && activeAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{activeAddress}</span>
                  </div>
                )}
                {config.supportHoursText && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 italic pt-0.5">
                    {config.supportHoursText}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Col 4: Trust, Security & Compliance Badges */}
          {config.showSecurityBadges && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Trust & Security</span>
              </h4>
              <div className="space-y-1.5">
                {enabledBadges.map(badge => (
                  <div 
                    key={badge.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                    title={badge.tooltip}
                  >
                    {renderBadgeIcon(badge.iconName)}
                    <span className="truncate">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom Bottom Note or Legal Disclaimer */}
        {config.customBottomNote && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-center sm:text-left text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            <p>{config.customBottomNote}</p>
          </div>
        )}

        {/* Bottom Bar: Copyright, Version, Cloud Sync Status, Super Admin Portal Badge & Scroll To Top */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Copyright and Made with Love */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {renderedCopyright}
            </span>
            {config.showVersion && config.versionText && (
              <>
                <span className="opacity-30">•</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {config.versionText}
                </span>
              </>
            )}
            {config.showMadeWithLove && (
              <>
                <span className="opacity-30 hidden md:inline">•</span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Engineered with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> in India
                </span>
              </>
            )}
          </div>

          {/* Right: Cloud Sync, Super Admin Portal button & Scroll To Top */}
          <div className="flex items-center gap-2.5">
            {config.showCloudSyncStatus && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{cloudSyncStatus === 'online' ? 'Firestore Synced' : 'Offline Cache'}</span>
              </div>
            )}

            {config.showSuperAdminPortalBadge && isSuperAdmin && (
              <button
                onClick={() => {
                  setActiveTab('super_admin_dashboard');
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-lg transition-all cursor-pointer"
                title="Super Admin Governance Portal"
              >
                <Crown className="w-3 h-3 text-amber-500" />
                <span>Super Admin</span>
              </button>
            )}

            {config.showScrollToTop && (
              <button
                onClick={scrollToTop}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="Back to Top"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
