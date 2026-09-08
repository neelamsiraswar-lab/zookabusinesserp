import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  HeaderConfig, 
  HeaderStyle, 
  HeaderDensity, 
  HeaderSearchStyle 
} from '../../types';
import { 
  DEFAULT_HEADER_CONFIG, 
  HEADER_PRESETS, 
  normalizeHeaderConfig 
} from '../../utils/headerDefaults';
import { 
  Building2, 
  Search, 
  Plus, 
  ShoppingCart, 
  Bell, 
  Sun, 
  Moon, 
  Cloud, 
  Sliders, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Save, 
  Eye, 
  ShieldCheck, 
  Laptop, 
  Tablet,
  Smartphone,
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  Receipt, 
  Crown, 
  Layers, 
  Palette, 
  Layout, 
  Info,
  Maximize2,
  X
} from 'lucide-react';
import { CloudSyncStatusBadge } from '../common/CloudSyncStatusBadge';
import { getAccentBg, getAccentText } from '../../utils/themeColors';
import { UserPersonaSwitcher } from '../auth/UserPersonaSwitcher';

interface HeaderSettingsTabProps {
  onSaved?: () => void;
  // Optional override for Super Admin per-company editing
  initialConfig?: HeaderConfig;
  onConfigChange?: (config: HeaderConfig) => void;
  isSuperAdminMode?: boolean;
  companyName?: string;
}

export const HeaderSettingsTab: React.FC<HeaderSettingsTabProps> = ({ 
  onSaved,
  initialConfig,
  onConfigChange,
  isSuperAdminMode = false,
  companyName
}) => {
  const { 
    business, 
    updateBusiness, 
    currentCompany, 
    showToast,
    theme,
    resolvedTheme,
    toggleTheme,
    invoices,
    products,
    can,
    setActiveTab: setGlobalActiveTab
  } = useApp();

  // Local configuration state initialized from business profile or prop
  const [config, setConfig] = useState<HeaderConfig>(() => {
    if (initialConfig) return normalizeHeaderConfig(initialConfig);
    return normalizeHeaderConfig(business.headerConfig || currentCompany?.headerConfig || DEFAULT_HEADER_CONFIG);
  });

  // Preview simulation state
  const [previewThemeMode, setPreviewThemeMode] = useState<'light' | 'dark'>('light');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'presets' | 'branding' | 'search' | 'actions' | 'tools' | 'style'>('presets');
  const [showPreviewNotifications, setShowPreviewNotifications] = useState(false);

  // Sync if business.headerConfig changes
  useEffect(() => {
    if (!initialConfig && business.headerConfig) {
      setConfig(normalizeHeaderConfig(business.headerConfig));
    }
  }, [business.headerConfig, initialConfig]);

  const updateConfigField = <K extends keyof HeaderConfig>(field: K, value: HeaderConfig[K]) => {
    const updated = {
      ...config,
      [field]: value
    };
    setConfig(updated);
    setSelectedPresetId(null);
    if (onConfigChange) {
      onConfigChange(updated);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = HEADER_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const updated = normalizeHeaderConfig(preset.config);
      setConfig(updated);
      setSelectedPresetId(presetId);
      if (onConfigChange) {
        onConfigChange(updated);
      }
      showToast('info', 'Preset Applied', `"${preset.name}" layout loaded into editor.`);
    }
  };

  const handleResetToDefault = () => {
    const defaultConf = normalizeHeaderConfig(DEFAULT_HEADER_CONFIG);
    setConfig(defaultConf);
    setSelectedPresetId('modern_business');
    if (onConfigChange) {
      onConfigChange(defaultConf);
    }
    showToast('info', 'Reset to Default', 'Header configuration restored to standard layout.');
  };

  const handleSaveConfig = () => {
    updateBusiness({
      headerConfig: config
    }, true);
    showToast('success', 'Header Settings Saved', 'Top navigation header customized successfully.');
    if (onSaved) onSaved();
  };


  // Density Height
  const getDensityClasses = (density: HeaderDensity) => {
    switch (density) {
      case 'COMPACT': return 'min-h-[52px] py-1.5 px-3 sm:px-4';
      case 'SPACIOUS': return 'min-h-[76px] py-3 px-5 sm:px-8';
      default: return 'min-h-[64px] py-2 px-4 sm:px-6'; // COMFORTABLE
    }
  };

  // Style Class
  const getHeaderStyleClasses = (style: HeaderStyle, isDark: boolean) => {
    switch (style) {
      case 'SOLID':
        return isDark ? 'bg-slate-900' : 'bg-white';
      case 'BORDERED':
        return isDark 
          ? 'bg-slate-950 border-b-2 border-slate-700' 
          : 'bg-slate-50 border-b-2 border-slate-300';
      case 'FLOATING':
        return isDark
          ? 'bg-slate-900/95 mx-2 my-2 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md'
          : 'bg-white/95 mx-2 my-2 rounded-2xl border border-slate-200 shadow-xl backdrop-blur-md';
      case 'MINIMAL':
        return isDark ? 'bg-slate-900/60' : 'bg-white/60';
      default: // GLASS
        return isDark 
          ? 'bg-slate-900/90 backdrop-blur-md' 
          : 'bg-white/90 backdrop-blur-md';
    }
  };

  // Shadow Class
  const getShadowClass = (shadow: string) => {
    switch (shadow) {
      case 'xs': return 'shadow-xs';
      case 'sm': return 'shadow-sm';
      case 'md': return 'shadow-md';
      case 'lg': return 'shadow-lg';
      default: return '';
    }
  };

  const isDarkPreview = previewThemeMode === 'dark';
  const activeCompName = companyName || currentCompany?.tradeName || currentCompany?.name || business.tradeName || business.name;
  const activeLegalName = currentCompany?.name || business.name;
  const activeGstin = currentCompany?.gstin || business.gstin;
  const activeState = currentCompany?.state || business.state;
  const activeCity = currentCompany?.city || business.city;
  const activeFy = currentCompany?.financialYear || '2026-2027';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-800/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Top Header Navigation Customizer</h2>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                Company & System Setting
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Customize company branding, search bar style, quick billing buttons, compliance badges, and header appearance.
            </p>
          </div>
        </div>

        {!isSuperAdminMode && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Header Setting
            </button>
          </div>
        )}
      </div>

      {/* LIVE INTERACTIVE HEADER PREVIEW */}
      <div className="bg-slate-100 dark:bg-slate-900/60 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live Real-Time Header Preview
            </span>
            <span className="text-[11px] text-slate-400">
              (Interactive simulation)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Viewport Switcher */}
            <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewViewport === 'desktop'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Desktop PC / Mac (1200px+)"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('tablet')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewViewport === 'tablet'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Tablet / iPad (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewViewport === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Smartphone (380px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phone</span>
              </button>
            </div>

            {/* Light / Dark Mode Toggle */}
            <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewThemeMode('light')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewThemeMode === 'light'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewThemeMode('dark')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewThemeMode === 'dark'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* The Live Rendered Header Sandbox */}
        <div className={`transition-all duration-300 ${
          previewViewport === 'mobile'
            ? 'max-w-[390px] mx-auto'
            : previewViewport === 'tablet'
            ? 'max-w-[768px] mx-auto'
            : 'w-full'
        }`}>
          <div className={`rounded-2xl border transition-all overflow-hidden ${
            isDarkPreview 
              ? 'bg-slate-950 border-slate-800 text-white' 
              : 'bg-slate-100/90 border-slate-300 text-slate-900'
          }`}>
          {/* Header Bar */}
          <div className={`w-full flex items-center justify-between transition-all ${
            getDensityClasses(config.density)
          } ${
            getHeaderStyleClasses(config.style, isDarkPreview)
          } ${
            config.showBorderBottom && config.style !== 'BORDERED' && config.style !== 'FLOATING'
              ? isDarkPreview ? 'border-b border-slate-800' : 'border-b border-slate-200' 
              : ''
          } ${
            getShadowClass(config.shadow)
          }`}>
            
            {/* Left: Branding & Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {config.showLogo && (
                <div className={`w-9 h-9 sm:w-10 sm:h-10 ${
                  config.logoShape === 'circle' ? 'rounded-full' : config.logoShape === 'square' ? 'rounded-md' : 'rounded-xl'
                } ${getAccentBg(config.customAccentColor)} flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 ring-1 ring-black/5 dark:ring-white/10`}>
                  <Building2 className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {config.showTradeName && (
                    <h2 className="text-xs sm:text-sm font-black truncate max-w-[150px] sm:max-w-[200px]">
                      {activeCompName}
                    </h2>
                  )}

                  {config.showLegalName && activeLegalName && activeLegalName !== activeCompName && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate">
                      ({activeLegalName})
                    </span>
                  )}

                  {config.showStateBadge && (
                    <span className={`hidden sm:inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isDarkPreview 
                        ? 'bg-slate-800 text-slate-300 border-slate-700' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      State: {activeGstin ? activeGstin.substring(0, 2) : '27'}
                    </span>
                  )}

                  {config.showFinancialYear && (
                    <span className="hidden md:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      FY {activeFy}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono truncate">
                  {config.showGstin && (
                    <span className={`font-semibold truncate ${getAccentText(config.customAccentColor)}`}>
                      GSTIN: {activeGstin}
                    </span>
                  )}
                  {config.showGstin && config.showLocation && (
                    <span className="hidden md:inline opacity-40">•</span>
                  )}
                  {config.showLocation && (
                    <span className="hidden md:inline opacity-70">
                      {activeCity ? `${activeCity}, ` : ''}{activeState}
                    </span>
                  )}
                  {config.customSubtitle && (
                    <>
                      <span className="hidden md:inline opacity-40">•</span>
                      <span className="text-[10px] opacity-80">{config.customSubtitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Universal Quick Search */}
            {config.showSearch && (
              <div className={`mx-3 hidden md:block ${
                config.searchStyle === 'EXPANDED' ? 'flex-1 max-w-lg' :
                config.searchStyle === 'MINIMAL' ? 'w-48' :
                'flex-1 max-w-md'
              }`}>
                <div className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all ${
                  config.searchStyle === 'PILL' ? 'rounded-full' : 'rounded-xl'
                } ${
                  isDarkPreview 
                    ? 'bg-slate-800/80 text-slate-400 border border-slate-700/80' 
                    : 'bg-slate-100/80 text-slate-500 border border-slate-200/80'
                }`}>
                  <span className="flex items-center gap-2 truncate">
                    <Search className="w-4 h-4 shrink-0 opacity-60" />
                    <span className="truncate">{config.searchPlaceholder || 'Search invoices, items, parties... (⌘K)'}</span>
                  </span>
                  <kbd className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${
                    isDarkPreview 
                      ? 'bg-slate-700 text-slate-300 border-slate-600' 
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                    ⌘K
                  </kbd>
                </div>
              </div>
            )}

            {/* Right: Quick Action CTAs & System Badges */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Cloud Sync Status */}
              {config.showCloudSyncBadge && (
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border ${
                  isDarkPreview
                    ? 'bg-slate-800/90 text-emerald-400 border-slate-700'
                    : 'bg-slate-100 text-emerald-700 border-slate-200'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Firestore Synced</span>
                </div>
              )}

              {/* Theme Mode Toggle Button */}
              {config.showThemeToggle && (
                <button
                  type="button"
                  onClick={() => setPreviewThemeMode(isDarkPreview ? 'light' : 'dark')}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkPreview 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title="Toggle Theme"
                >
                  {isDarkPreview ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
              )}

              {/* Quick POS Mobile / Counter Bill Button */}
              {config.showQuickPosBtn && (
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    isDarkPreview
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{config.quickPosBtnText || 'Quick POS'}</span>
                </button>
              )}

              {/* Quick Payment Button */}
              {config.showQuickPaymentBtn && (
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    isDarkPreview
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Receive ₹</span>
                </button>
              )}

              {/* Quick Expense Button */}
              {config.showQuickExpenseBtn && (
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    isDarkPreview
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Expense</span>
                </button>
              )}

              {/* Create GST Tax Invoice CTA */}
              {config.showNewInvoiceBtn && (
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-md transition-all ${getAccentBg(config.customAccentColor)}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{config.newInvoiceBtnText || 'New Invoice'}</span>
                </button>
              )}

              {/* Fullscreen App Button Simulation */}
              {config.showFullScreenBtn !== false && (
                <div className={`p-1.5 rounded-xl border ${
                  isDarkPreview ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  <Maximize2 className="w-4 h-4" />
                </div>
              )}

              {/* Theme Mode Toggle Simulation */}
              {config.showThemeToggle && (
                <div className={`p-1.5 rounded-xl border ${
                  isDarkPreview ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  {isDarkPreview ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </div>
              )}

              {/* User Persona Profile Pill Simulation */}
              {config.showUserPersona && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${
                  isDarkPreview ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                    AD
                  </div>
                  <span className="hidden sm:inline text-slate-700 dark:text-slate-200">Admin</span>
                </div>
              )}

              {/* Notification Bell */}
              {config.showNotificationBell && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPreviewNotifications(!showPreviewNotifications)}
                    className={`relative p-2 rounded-xl transition-colors ${
                      isDarkPreview ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sandbox Body Content Placeholder */}
          <div className="p-6 text-center space-y-1">
            <p className="text-xs font-medium opacity-60">
              Workspace Canvas below navigation bar (Header Style: <strong className="opacity-90">{config.style}</strong>, Density: <strong className="opacity-90">{config.density}</strong>)
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* TABS NAVIGATION FOR CUSTOMIZATION SECTIONS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection('presets')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'presets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          1-Click Presets ({HEADER_PRESETS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('branding')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'branding'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Company Identity & Branding
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('search')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'search'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Universal Search Bar
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('actions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'actions'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Quick Action Buttons & CTAs
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('tools')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'tools'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          System Badges & Tools
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('style')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'style'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Layout & Visual Styling
        </button>
      </div>

      {/* SECTION 1: 1-CLICK PRESETS */}
      {activeSection === 'presets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HEADER_PRESETS.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {preset.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Currently Applied' : 'Apply Preset'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: BRANDING & IDENTITY */}
      {activeSection === 'branding' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Company Identity & Tax Details Display
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Control which business identifiers appear in the top-left section</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Show Logo */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Company Logo / Icon</p>
                <p className="text-[11px] text-slate-400">Display brand avatar badge</p>
              </div>
              <input
                type="checkbox"
                checked={config.showLogo}
                onChange={e => updateConfigField('showLogo', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Logo Shape */}
            {config.showLogo && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Logo Icon Shape</p>
                <div className="flex gap-2">
                  {(['rounded', 'circle', 'square'] as const).map(shape => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => updateConfigField('logoShape', shape)}
                      className={`px-3 py-1 text-xs font-bold capitalize rounded-lg border transition-all cursor-pointer ${
                        config.logoShape === shape
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show Trade Name */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Trade / Brand Name</p>
                <p className="text-[11px] text-slate-400">Display company brand title</p>
              </div>
              <input
                type="checkbox"
                checked={config.showTradeName}
                onChange={e => updateConfigField('showTradeName', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Show Legal Name */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Legal Entity Name</p>
                <p className="text-[11px] text-slate-400">Show registered legal name in brackets</p>
              </div>
              <input
                type="checkbox"
                checked={config.showLegalName}
                onChange={e => updateConfigField('showLegalName', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Show GSTIN */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">GSTIN Identifier</p>
                <p className="text-[11px] text-slate-400">Show 15-digit GSTIN pill</p>
              </div>
              <input
                type="checkbox"
                checked={config.showGstin}
                onChange={e => updateConfigField('showGstin', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Show State Badge */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">State Code Badge</p>
                <p className="text-[11px] text-slate-400">Show 2-digit GST state code</p>
              </div>
              <input
                type="checkbox"
                checked={config.showStateBadge}
                onChange={e => updateConfigField('showStateBadge', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Show Location */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">City & State Name</p>
                <p className="text-[11px] text-slate-400">Show geographical location</p>
              </div>
              <input
                type="checkbox"
                checked={config.showLocation}
                onChange={e => updateConfigField('showLocation', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Show Financial Year */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Financial Year Tag</p>
                <p className="text-[11px] text-slate-400">Show active FY e.g. FY 2026-27</p>
              </div>
              <input
                type="checkbox"
                checked={config.showFinancialYear}
                onChange={e => updateConfigField('showFinancialYear', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: UNIVERSAL SEARCH BAR */}
      {activeSection === 'search' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              Universal Search Bar & Shortcut (⌘K)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Configure the global search trigger in the center of the header</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-2">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Search Bar in Header</p>
                <p className="text-[11px] text-slate-400">Allows instant shortcut search across invoices, stock & parties</p>
              </div>
              <input
                type="checkbox"
                checked={config.showSearch}
                onChange={e => updateConfigField('showSearch', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {config.showSearch && (
              <>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Search Bar Layout Style
                  </label>
                  <select
                    value={config.searchStyle}
                    onChange={e => updateConfigField('searchStyle', e.target.value as HeaderSearchStyle)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="COMPACT">Compact (Max 440px - Standard)</option>
                    <option value="EXPANDED">Expanded (Max 560px - Wide)</option>
                    <option value="PILL">Pill Curved (Rounded Full)</option>
                    <option value="MINIMAL">Minimal (Narrow 200px)</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Custom Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={config.searchPlaceholder || ''}
                    onChange={e => updateConfigField('searchPlaceholder', e.target.value)}
                    placeholder="Search invoices, inventory, parties... (⌘K)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: QUICK ACTIONS & CTAS */}
      {activeSection === 'actions' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Quick Action Buttons & CTAs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Configure transaction creation shortcuts visible in the header</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Invoice Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Primary "New Invoice" Button</p>
                  <p className="text-[11px] text-slate-400">Main gradient CTA to create GST invoices</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showNewInvoiceBtn}
                  onChange={e => updateConfigField('showNewInvoiceBtn', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {config.showNewInvoiceBtn && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Button Label Text
                  </label>
                  <input
                    type="text"
                    value={config.newInvoiceBtnText || ''}
                    onChange={e => updateConfigField('newInvoiceBtnText', e.target.value)}
                    placeholder="New Invoice"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Quick POS Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">"Quick POS" Counter Bill Button</p>
                  <p className="text-[11px] text-slate-400">Fast point-of-sale billing shortcut</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showQuickPosBtn}
                  onChange={e => updateConfigField('showQuickPosBtn', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {config.showQuickPosBtn && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Button Label Text
                  </label>
                  <input
                    type="text"
                    value={config.quickPosBtnText || ''}
                    onChange={e => updateConfigField('quickPosBtnText', e.target.value)}
                    placeholder="Quick POS"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Quick Payment Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">"Receive Payment" Shortcut</p>
                <p className="text-[11px] text-slate-400">Quick link to record customer receipts</p>
              </div>
              <input
                type="checkbox"
                checked={config.showQuickPaymentBtn}
                onChange={e => updateConfigField('showQuickPaymentBtn', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Quick Expense Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">"Add Expense" Shortcut</p>
                <p className="text-[11px] text-slate-400">Quick link to log petty cash & company bills</p>
              </div>
              <input
                type="checkbox"
                checked={config.showQuickExpenseBtn}
                onChange={e => updateConfigField('showQuickExpenseBtn', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: SYSTEM BADGES & TOOLS */}
      {activeSection === 'tools' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              System Badges, Sync & Tools
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Control utilities, live cloud indicators, and compliance bells</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Google Cloud DB Sync Badge */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Firestore Cloud Sync Badge</p>
                <p className="text-[11px] text-slate-400">Live cloud database connectivity status pill</p>
              </div>
              <input
                type="checkbox"
                checked={config.showCloudSyncBadge}
                onChange={e => updateConfigField('showCloudSyncBadge', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Full Screen Mode Toggle Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Full Screen App Mode Toggle</p>
                <p className="text-[11px] text-slate-400">Maximize full-viewport app mode icon in top navbar</p>
              </div>
              <input
                type="checkbox"
                checked={config.showFullScreenBtn !== false}
                onChange={e => updateConfigField('showFullScreenBtn', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Sidebar Collapse Toggle Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sidebar Collapse Icon Button</p>
                <p className="text-[11px] text-slate-400">Expand / collapse sidebar toggle (⌘B) in header</p>
              </div>
              <input
                type="checkbox"
                checked={config.showSidebarToggle !== false}
                onChange={e => updateConfigField('showSidebarToggle', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Theme Mode Toggle Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Light / Dark Theme Toggle</p>
                <p className="text-[11px] text-slate-400">Quick sun/moon toggle switch in header</p>
              </div>
              <input
                type="checkbox"
                checked={config.showThemeToggle}
                onChange={e => updateConfigField('showThemeToggle', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Notification Bell */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Compliance & Alert Bell</p>
                <p className="text-[11px] text-slate-400">Displays low-stock and overdue payment badges</p>
              </div>
              <input
                type="checkbox"
                checked={config.showNotificationBell}
                onChange={e => updateConfigField('showNotificationBell', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* User Persona Switcher */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">User Role Persona Switcher</p>
                <p className="text-[11px] text-slate-400">Active user avatar and role switching drawer</p>
              </div>
              <input
                type="checkbox"
                checked={config.showUserPersona}
                onChange={e => updateConfigField('showUserPersona', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: LAYOUT & VISUAL STYLING */}
      {activeSection === 'style' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              Layout, Density & Visual Styling
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Control backdrop materials, height density, shadows and accents</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Header Style */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Backdrop Material / Style
              </label>
              <select
                value={config.style}
                onChange={e => updateConfigField('style', e.target.value as HeaderStyle)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="GLASS">Glassmorphism (Frosted Blur)</option>
                <option value="SOLID">Solid Opaque Background</option>
                <option value="BORDERED">Bordered Heavy (High Contrast)</option>
                <option value="FLOATING">Floating Rounded Pill</option>
                <option value="MINIMAL">Minimal Transparent</option>
              </select>
            </div>

            {/* Density / Height */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Header Height & Density
              </label>
              <select
                value={config.density}
                onChange={e => updateConfigField('density', e.target.value as HeaderDensity)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="COMPACT">Compact (52px - High Density)</option>
                <option value="COMFORTABLE">Comfortable (64px - Default Standard)</option>
                <option value="SPACIOUS">Spacious (76px - Large Luxury)</option>
              </select>
            </div>

            {/* Accent Theme Color */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Header Accent Palette
              </label>
              <select
                value={config.customAccentColor || 'auto'}
                onChange={e => updateConfigField('customAccentColor', e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="auto">Auto (Match Company Theme)</option>
                <option value="indigo">Indigo Sapphire</option>
                <option value="emerald">Emerald Pharma Green</option>
                <option value="blue">Royal Blue</option>
                <option value="amber">Warm Amber Gold</option>
                <option value="purple">Vibrant Purple</option>
                <option value="rose">Rose Crimson</option>
                <option value="cyan">Cyan Aqua</option>
                <option value="slate">Slate Charcoal</option>
              </select>
            </div>

            {/* Sticky Header */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sticky On Scroll</p>
                <p className="text-[11px] text-slate-400">Keep header pinned at top while scrolling</p>
              </div>
              <input
                type="checkbox"
                checked={config.sticky}
                onChange={e => updateConfigField('sticky', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Bottom Border */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Subtle Bottom Border</p>
                <p className="text-[11px] text-slate-400">Clean separator line below header</p>
              </div>
              <input
                type="checkbox"
                checked={config.showBorderBottom}
                onChange={e => updateConfigField('showBorderBottom', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Shadow Depth */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Shadow Depth
              </label>
              <select
                value={config.shadow}
                onChange={e => updateConfigField('shadow', e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="none">None (Flat)</option>
                <option value="xs">Extra Subtle (xs)</option>
                <option value="sm">Soft Elevation (sm)</option>
                <option value="md">Medium Depth (md)</option>
                <option value="lg">Heavy Floating Depth (lg)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Footer */}
      {!isSuperAdminMode && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Changes ready to apply to company top bar
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Reset to Standard
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save & Apply Header
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
