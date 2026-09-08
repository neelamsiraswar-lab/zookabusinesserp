import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FooterConfig, FooterBadge, FooterQuickLink, FooterStyle, FooterDensity } from '../../types';
import { 
  Building2, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  Eye, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Sliders, 
  Palette, 
  Phone, 
  Mail, 
  MapPin, 
  Crown, 
  ArrowUp, 
  Heart, 
  Plus, 
  Trash2, 
  HelpCircle,
  Clock,
  Lock,
  Server,
  Award,
  Zap,
  Check
} from 'lucide-react';
import { 
  DEFAULT_FOOTER_CONFIG, 
  FOOTER_PRESETS, 
  DEFAULT_FOOTER_BADGES, 
  DEFAULT_FOOTER_QUICK_LINKS, 
  normalizeFooterConfig,
  interpolateFooterText
} from '../../utils/footerDefaults';
import { getAccentBg, getAccentText } from '../../utils/themeColors';

interface FooterSettingsTabProps {
  initialConfig?: FooterConfig;
  onSaveConfig?: (config: FooterConfig) => void;
  isSuperAdminContext?: boolean;
  companyId?: string;
  companyName?: string;
}

export const FooterSettingsTab: React.FC<FooterSettingsTabProps> = ({
  initialConfig,
  onSaveConfig,
  isSuperAdminContext = false,
  companyId,
  companyName,
}) => {
  const { business, currentCompany, companies, updateBusiness, editBusinessProfile, showToast } = useApp();

  const baseConfig = normalizeFooterConfig(
    initialConfig || business.footerConfig || currentCompany?.footerConfig
  );

  const [config, setConfig] = useState<FooterConfig>(baseConfig);
  const [activeSection, setActiveSection] = useState<'presets' | 'layout' | 'branding' | 'links' | 'contact' | 'badges' | 'system'>('presets');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [newBadgeLabel, setNewBadgeLabel] = useState('');
  const [newBadgeTooltip, setNewBadgeTooltip] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState<'shield' | 'lock' | 'award' | 'server' | 'check' | 'zap'>('shield');

  // Dynamic variable values for live preview
  const activeCompName = config.customBrandName || companyName || currentCompany?.tradeName || currentCompany?.name || business.tradeName || business.name || 'Zooka Business Enterprise';
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

  const handleApplyPreset = (presetConfig: FooterConfig) => {
    setConfig(presetConfig);
    showToast('info', 'Preset Applied', 'Footer settings updated from preset. Click Save Changes to keep.');
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_FOOTER_CONFIG);
    showToast('info', 'Reset to Defaults', 'Footer settings restored to standard factory configuration.');
  };

  const handleSave = () => {
    if (onSaveConfig) {
      onSaveConfig(config);
      showToast('success', 'Footer Configuration Saved', 'App footer layout and content have been updated.');
      return;
    }

    if (isSuperAdminContext && companyId) {
      const targetCompany = companies.find(c => c.id === companyId);
      if (targetCompany) {
        editBusinessProfile(
          companyId,
          { footerConfig: config },
          { footerConfig: config }
        );
      }
      showToast('success', 'Company Footer Saved', `Footer customized for ${companyName || 'selected company'}.`);
    } else {
      updateBusiness({
        ...business,
        footerConfig: config,
      });
      showToast('success', 'Footer Settings Saved', 'Your application footer layout has been updated.');
    }
  };

  const handleBroadcastToAllCompanies = () => {
    if (!isSuperAdminContext) return;
    companies.forEach(comp => {
      editBusinessProfile(
        comp.id,
        { footerConfig: config },
        { footerConfig: config }
      );
    });
    showToast('success', 'Broadcast Complete', `Applied footer configuration across all ${companies.length} business entities.`);
  };

  const handleAddCustomBadge = () => {
    if (!newBadgeLabel.trim()) return;
    const newBadge: FooterBadge = {
      id: `bdg-custom-${Date.now()}`,
      label: newBadgeLabel.trim(),
      tooltip: newBadgeTooltip.trim() || newBadgeLabel.trim(),
      iconName: newBadgeIcon,
      isEnabled: true,
    };
    setConfig(prev => ({
      ...prev,
      badges: [...(prev.badges || []), newBadge]
    }));
    setNewBadgeLabel('');
    setNewBadgeTooltip('');
    showToast('success', 'Badge Added', `Added "${newBadge.label}" to trust badges.`);
  };

  const handleRemoveBadge = (id: string) => {
    setConfig(prev => ({
      ...prev,
      badges: (prev.badges || []).filter(b => b.id !== id)
    }));
  };

  const handleToggleBadge = (id: string) => {
    setConfig(prev => ({
      ...prev,
      badges: (prev.badges || []).map(b => b.id === id ? { ...b, isEnabled: !b.isEnabled } : b)
    }));
  };

  const handleToggleLink = (id: string) => {
    setConfig(prev => ({
      ...prev,
      quickLinks: (prev.quickLinks || []).map(l => l.id === id ? { ...l, isEnabled: !l.isEnabled } : l)
    }));
  };

  const insertVariableIntoCopyright = (variableTag: string) => {
    setConfig(prev => ({
      ...prev,
      copyrightText: (prev.copyrightText || '') + ' ' + variableTag
    }));
  };


  const enabledBadges = config.badges ? config.badges.filter(b => b.isEnabled) : [];
  const enabledQuickLinks = config.quickLinks ? config.quickLinks.filter(l => l.isEnabled) : [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Application Footer Bar Customizer</h2>
              <p className="text-xs text-indigo-200">
                {isSuperAdminContext
                  ? `Super Admin Central Control • Target: ${companyName || 'Multi-Company Tenant'}`
                  : 'Customize copyright, compliance badges, quick links, and support hotline'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
            title="Reset to factory default footer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          {isSuperAdminContext && (
            <button
              type="button"
              onClick={handleBroadcastToAllCompanies}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/40 border border-purple-400/30"
              title="Broadcast this footer configuration to all registered businesses"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Broadcast to All Companies</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/30"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Live Interactive Footer Preview Box */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Interactive Live Preview</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Rendering
            </span>
          </div>

          {/* Viewport Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('tablet')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'tablet'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        </div>

        {/* Device Viewport Simulation Frame */}
        <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200/80 flex items-center justify-center overflow-x-auto">
          <div className={`w-full transition-all duration-300 ${
            previewDevice === 'mobile' ? 'max-w-sm' :
            previewDevice === 'tablet' ? 'max-w-2xl' : 'max-w-full'
          }`}>
            {config.enabled === false ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                ⚠️ Footer is currently disabled. Toggle &quot;Enable Footer&quot; below to show.
              </div>
            ) : config.style === 'MINIMAL' ? (
              /* Minimal Style Preview */
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{renderedCopyright}</span>
                    {config.showVersion && (
                      <span className="font-mono text-[10px] text-slate-500">• {config.versionText || 'v4.2.0'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {config.showCloudSyncStatus && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Firestore Synced
                      </span>
                    )}
                    {config.showScrollToTop && (
                      <div className="p-1 rounded bg-slate-100 text-slate-500">
                        <ArrowUp className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Standard / Detailed / Floating Preview */
              <div className={`p-5 rounded-2xl border text-slate-600 space-y-4 ${
                config.style === 'FLOATING'
                  ? 'bg-white/95 rounded-3xl border-slate-300 shadow-xl backdrop-blur-md m-1'
                  : config.style === 'GRADIENT'
                  ? 'bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 border-indigo-100'
                  : config.style === 'MODERN_CARD'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Branding */}
                  {config.showBranding && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg ${getAccentBg(config.customAccentColor)} flex items-center justify-center font-bold text-xs`}>
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">{activeCompName}</h4>
                      </div>
                      {config.customTagline && (
                        <p className="text-[11px] text-slate-500 leading-tight">{config.customTagline}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {config.showGstin && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 ${getAccentText(config.customAccentColor)}`}>
                            GSTIN: {activeGstin}
                          </span>
                        )}
                        {config.showStateCode && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                            State: {activeGstin.substring(0, 2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {config.showQuickLinks && enabledQuickLinks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                        {config.quickLinksTitle || 'Quick Navigation'}
                      </p>
                      <ul className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                        {enabledQuickLinks.slice(0, 6).map(link => (
                          <li key={link.id} className="truncate flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Contact */}
                  {config.showContactInfo && (
                    <div className="space-y-1 text-[11px]">
                      <p className="font-bold uppercase tracking-wider text-slate-900">Support & Contact</p>
                      {config.showPhone && activePhone && (
                        <div className="flex items-center gap-1 text-slate-600 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{activePhone}</span>
                        </div>
                      )}
                      {config.showEmail && activeEmail && (
                        <div className="flex items-center gap-1 text-slate-600 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{activeEmail}</span>
                        </div>
                      )}
                      {config.supportHoursText && (
                        <p className="text-[10px] text-slate-400 italic pt-0.5">{config.supportHoursText}</p>
                      )}
                    </div>
                  )}

                  {/* Badges */}
                  {config.showSecurityBadges && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">Trust & Security</p>
                      <div className="space-y-1">
                        {enabledBadges.slice(0, 3).map(b => (
                          <div key={b.id} className="flex items-center gap-1.5 p-1 rounded bg-slate-100/80 border border-slate-200/80 text-[10px] font-medium text-slate-700 truncate">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {config.customBottomNote && (
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                    {config.customBottomNote}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-slate-700 truncate">{renderedCopyright}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {config.showCloudSyncStatus && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Firestore Synced
                      </span>
                    )}
                    {config.showSuperAdminPortalBadge && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-amber-500" />
                        Super Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sections Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveSection('presets')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'presets'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Presets & Master Switch</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('layout')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'layout'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-indigo-600" />
          <span>Style, Theme & Density</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('branding')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'branding'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Branding & Copyright</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('links')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'links'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick Navigation Links</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('contact')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'contact'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Phone className="w-3.5 h-3.5 text-indigo-600" />
          <span>Contact & Support Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('badges')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'badges'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Trust & Security Badges</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('system')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'system'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          <span>System Tags & Tools</span>
        </button>
      </div>

      {/* Section 1: Presets & Master Switch */}
      {activeSection === 'presets' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Master Enable/Disable Switch */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.enabled !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Enable Application Bottom Footer</h4>
                <p className="text-xs text-slate-500">Render the customizable footer at the bottom of the workspace layout</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, enabled: prev.enabled === false ? true : false }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                config.enabled !== false ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled !== false ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Preset Cards Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">1-Click Professional Footer Presets</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {FOOTER_PRESETS.map(preset => (
                <div
                  key={preset.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-900">{preset.name}</h5>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {preset.config.style}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{preset.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset.config)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Preset</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Style, Theme & Density */}
      {activeSection === 'layout' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6 animate-fadeIn">
          {/* Layout Style */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Layout Style Variant</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'CLASSIC', name: 'Classic Clean', desc: 'Solid background with top divider line' },
                { id: 'MINIMAL', name: 'Minimalist Row', desc: 'Compact single-row bottom bar' },
                { id: 'FLOATING', name: 'Floating Glass Card', desc: 'Rounded pill container with backdrop blur' },
                { id: 'GRADIENT', name: 'Gradient Modern', desc: 'Subtle high-tech background gradient' },
                { id: 'MODERN_CARD', name: 'Framed Card', desc: 'Boxed clean border styling' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, style: s.id as FooterStyle }))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    config.style === s.id
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{s.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Height & Padding Density</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'COMPACT', name: 'Compact', desc: 'Minimal vertical space' },
                { id: 'COMFORTABLE', name: 'Comfortable', desc: 'Standard balanced spacing' },
                { id: 'SPACIOUS', name: 'Spacious', desc: 'Generous executive padding' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, density: d.id as FooterDensity }))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    config.density === d.id
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{d.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Accent Color Theme</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'auto', name: 'Auto (Company)', color: 'bg-slate-700' },
                { id: 'indigo', name: 'Indigo Blue', color: 'bg-indigo-600' },
                { id: 'emerald', name: 'Emerald Teal', color: 'bg-emerald-600' },
                { id: 'blue', name: 'Royal Blue', color: 'bg-blue-600' },
                { id: 'amber', name: 'Amber Bronze', color: 'bg-amber-600' },
                { id: 'purple', name: 'Royal Purple', color: 'bg-purple-600' },
                { id: 'rose', name: 'Rose Red', color: 'bg-rose-600' },
                { id: 'cyan', name: 'Cyan Tech', color: 'bg-cyan-600' },
                { id: 'slate', name: 'Slate Gray', color: 'bg-slate-600' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, customAccentColor: c.id as any }))}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    config.customAccentColor === c.id
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${c.color} shrink-0`} />
                  <span className="text-xs truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shadow & Border */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Elevation Shadow</label>
              <select
                value={config.shadow || 'none'}
                onChange={e => setConfig(prev => ({ ...prev, shadow: e.target.value as any }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="none">No Shadow</option>
                <option value="xs">Extra Small (xs)</option>
                <option value="sm">Small (sm)</option>
                <option value="md">Medium (md)</option>
                <option value="lg">Large (lg)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
              <span className="text-xs font-bold text-slate-800">Show Top Border Line</span>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showBorderTop: !prev.showBorderTop }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showBorderTop ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showBorderTop ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Branding & Copyright */}
      {activeSection === 'branding' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Brand Display Name (Optional)</label>
              <input
                type="text"
                value={config.customBrandName || ''}
                onChange={e => setConfig(prev => ({ ...prev, customBrandName: e.target.value }))}
                placeholder={activeCompName}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">Leave blank to use default workspace trade name</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Brand Tagline</label>
              <input
                type="text"
                value={config.customTagline || ''}
                onChange={e => setConfig(prev => ({ ...prev, customTagline: e.target.value }))}
                placeholder="e.g. Modern High-Speed GST Accounting & Enterprise Platform"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Copyright Template Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Copyright Statement Template *</label>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span>Insert Tags:</span>
                <button
                  type="button"
                  onClick={() => insertVariableIntoCopyright('{year}')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-indigo-600 font-bold"
                >
                  {'{year}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariableIntoCopyright('{companyName}')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-indigo-600 font-bold"
                >
                  {'{companyName}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariableIntoCopyright('{gstin}')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-indigo-600 font-bold"
                >
                  {'{gstin}'}
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              value={config.copyrightText || ''}
              onChange={e => setConfig(prev => ({ ...prev, copyrightText: e.target.value }))}
              placeholder="© {year} {companyName}. All rights reserved. GST Compliant ERP."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Evaluated Preview: <strong className="text-slate-800">{renderedCopyright}</strong>
            </p>
          </div>

          {/* Bottom Note / Disclaimer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Custom Bottom Note / Regulatory Disclaimer</label>
            <textarea
              rows={2}
              value={config.customBottomNote || ''}
              onChange={e => setConfig(prev => ({ ...prev, customBottomNote: e.target.value }))}
              placeholder="e.g. Authorized for trade transactions across India. Compliant with GST e-invoicing mandate rules."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Show Brand Logo & Name</span>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showBranding: !prev.showBranding }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showBranding ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showBranding ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Show GSTIN Badge</span>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showGstin: !prev.showGstin }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showGstin ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showGstin ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Show &quot;Made in India&quot; Tag</span>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showMadeWithLove: !prev.showMadeWithLove }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showMadeWithLove ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showMadeWithLove ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Quick Navigation Links */}
      {activeSection === 'links' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Quick App Navigation Links</h4>
              <p className="text-xs text-slate-500">Provide direct 1-click links to primary modules for easy user navigation</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, showQuickLinks: !prev.showQuickLinks }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                config.showQuickLinks ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.showQuickLinks ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Navigation Section Title</label>
            <input
              type="text"
              value={config.quickLinksTitle || ''}
              onChange={e => setConfig(prev => ({ ...prev, quickLinksTitle: e.target.value }))}
              placeholder="Quick Navigation"
              className="w-full sm:w-80 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Links Toggles List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(config.quickLinks || DEFAULT_FOOTER_QUICK_LINKS).map(link => (
              <div
                key={link.id}
                onClick={() => handleToggleLink(link.id)}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  link.isEnabled
                    ? 'border-indigo-500 bg-indigo-50/40 text-slate-900 font-bold'
                    : 'border-slate-200 bg-slate-50/50 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${link.isEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  <span className="text-xs truncate">{link.label}</span>
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                  {link.isEnabled ? 'Active' : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Contact & Support Matrix */}
      {activeSection === 'contact' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Support & Contact Information Matrix</h4>
              <p className="text-xs text-slate-500">Display official contact lines, customer support phone & address</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, showContactInfo: !prev.showContactInfo }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                config.showContactInfo ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.showContactInfo ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Official Support Phone</label>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, showPhone: !prev.showPhone }))}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  {config.showPhone ? '✓ Displayed' : '✗ Hidden'}
                </button>
              </div>
              <input
                type="text"
                value={config.customPhone || ''}
                onChange={e => setConfig(prev => ({ ...prev, customPhone: e.target.value }))}
                placeholder={activePhone}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Support Email Address</label>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, showEmail: !prev.showEmail }))}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  {config.showEmail ? '✓ Displayed' : '✗ Hidden'}
                </button>
              </div>
              <input
                type="email"
                value={config.customEmail || ''}
                onChange={e => setConfig(prev => ({ ...prev, customEmail: e.target.value }))}
                placeholder={activeEmail}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Office / Branch Address</label>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, showAddress: !prev.showAddress }))}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  {config.showAddress ? '✓ Displayed' : '✗ Hidden'}
                </button>
              </div>
              <input
                type="text"
                value={config.customAddress || ''}
                onChange={e => setConfig(prev => ({ ...prev, customAddress: e.target.value }))}
                placeholder={activeAddress}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operating Hours Tagline</label>
              <input
                type="text"
                value={config.supportHoursText || ''}
                onChange={e => setConfig(prev => ({ ...prev, supportHoursText: e.target.value }))}
                placeholder="e.g. Mon - Sat: 9:30 AM - 7:30 PM IST"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Trust & Security Badges */}
      {activeSection === 'badges' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Trust, GST Compliance & Security Badges</h4>
              <p className="text-xs text-slate-500">Demonstrate compliance with GSTN, SSL encryption, and high-availability standards</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, showSecurityBadges: !prev.showSecurityBadges }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                config.showSecurityBadges ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.showSecurityBadges ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Badges List */}
          <div className="space-y-2.5">
            {(config.badges || DEFAULT_FOOTER_BADGES).map(badge => (
              <div
                key={badge.id}
                className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleBadge(badge.id)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                      badge.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${badge.isEnabled ? 'text-slate-900' : 'text-slate-400'}`}>
                      {badge.label}
                    </p>
                    {badge.tooltip && (
                      <p className="text-[10px] text-slate-500 truncate">{badge.tooltip}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleBadge(badge.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      badge.isEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {badge.isEnabled ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBadge(badge.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Remove Badge"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Badge */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Custom Trust or Certification Badge</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newBadgeLabel}
                onChange={e => setNewBadgeLabel(e.target.value)}
                placeholder="Badge Title (e.g. ISO 9001 Certified)"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <input
                type="text"
                value={newBadgeTooltip}
                onChange={e => setNewBadgeTooltip(e.target.value)}
                placeholder="Tooltip Description (e.g. Certified Quality Process)"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newBadgeIcon}
                  onChange={e => setNewBadgeIcon(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white flex-1 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="shield">Shield Icon</option>
                  <option value="lock">Lock Icon</option>
                  <option value="award">Award Icon</option>
                  <option value="server">Server Icon</option>
                  <option value="check">Check Icon</option>
                  <option value="zap">Lightning Icon</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomBadge}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-sm shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 7: System Tags & Tools */}
      {activeSection === 'system' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Version & Build Tagline</label>
              <input
                type="text"
                value={config.versionText || ''}
                onChange={e => setConfig(prev => ({ ...prev, versionText: e.target.value }))}
                placeholder="v4.2.0 • Enterprise Cloud Edition"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2 sm:mt-5">
              <div>
                <span className="text-xs font-bold text-slate-800">Show Version Number</span>
                <p className="text-[10px] text-slate-400">Display release version in bottom copyright bar</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showVersion: !prev.showVersion }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showVersion ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showVersion ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800">Cloud Sync Status Badge</span>
                <p className="text-[10px] text-slate-400">Green realtime synced tag</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showCloudSyncStatus: !prev.showCloudSyncStatus }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showCloudSyncStatus ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showCloudSyncStatus ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800">Super Admin Portal Trigger</span>
                <p className="text-[10px] text-slate-400">Direct shortcut button</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showSuperAdminPortalBadge: !prev.showSuperAdminPortalBadge }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showSuperAdminPortalBadge ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showSuperAdminPortalBadge ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800">Back To Top Scroll Button</span>
                <p className="text-[10px] text-slate-400">Smooth window scroll button</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, showScrollToTop: !prev.showScrollToTop }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.showScrollToTop ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  config.showScrollToTop ? 'translate-x-4.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <span className="text-xs text-slate-500 font-medium">
          Changes will reflect immediately across all screens and device viewports.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Footer Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
