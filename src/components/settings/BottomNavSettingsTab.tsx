import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { 
  BottomNavConfig, 
  BottomNavTabItem, 
  BottomNavStyle, 
  QuickActionType 
} from '../../types';
import { 
  ALL_AVAILABLE_NAV_TABS, 
  DEFAULT_BOTTOM_NAV_CONFIG, 
  BOTTOM_NAV_PRESETS,
  TabMetaDefinition 
} from '../../utils/bottomNavDefaults';
import { getThemePalette, THEME_PALETTES } from '../../utils/themeColors';
import { 
  Smartphone, 
  Check, 
  RotateCcw, 
  Save, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Sliders, 
  Plus, 
  PlusCircle,
  Menu, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Truck,
  BookOpenCheck,
  Calculator,
  ShieldCheck,
  Settings,
  X
} from 'lucide-react';

interface BottomNavSettingsTabProps {
  onSaved?: () => void;
}

export const BottomNavSettingsTab: React.FC<BottomNavSettingsTabProps> = ({ onSaved }) => {
  const { business, currentCompany, updateBusiness, showToast, setActiveTab: setGlobalActiveTab, products } = useApp();

  // Safe normalization helper for bottom nav configuration
  const normalizeNavConfig = (cfg?: Partial<BottomNavConfig> | null): BottomNavConfig => {
    if (!cfg) return DEFAULT_BOTTOM_NAV_CONFIG;
    return {
      ...DEFAULT_BOTTOM_NAV_CONFIG,
      ...cfg,
      tabs: Array.isArray(cfg.tabs) && cfg.tabs.length > 0 
        ? cfg.tabs.map((t, idx) => ({ ...t, isEnabled: typeof t.isEnabled === 'boolean' ? t.isEnabled : true, order: typeof t.order === 'number' ? t.order : idx }))
        : DEFAULT_BOTTOM_NAV_CONFIG.tabs,
      quickActionItems: Array.isArray(cfg.quickActionItems) ? cfg.quickActionItems : DEFAULT_BOTTOM_NAV_CONFIG.quickActionItems
    };
  };

  // Local configuration state initialized from current business profile or fallback
  const [config, setConfig] = useState<BottomNavConfig>(() => {
    return normalizeNavConfig(business.bottomNavConfig);
  });

  // Effective color palette for the bottom navigation
  const effectiveThemeColor = (config.color && config.color !== 'auto') ? config.color : (currentCompany?.themeColor || 'indigo');
  const palette = getThemePalette(effectiveThemeColor);

  // Simulated active tab in preview
  const [previewActiveTab, setPreviewActiveTab] = useState<string>('dashboard');
  const [previewQuickActionOpen, setPreviewQuickActionOpen] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Sync state if business changes
  useEffect(() => {
    if (business.bottomNavConfig) {
      setConfig(normalizeNavConfig(business.bottomNavConfig));
    }
  }, [business.bottomNavConfig]);

  // Derived list of active enabled tabs in sorted order
  const sortedTabs = useMemo(() => {
    const tabsList = Array.isArray(config?.tabs) && config.tabs.length > 0 ? config.tabs : DEFAULT_BOTTOM_NAV_CONFIG.tabs;
    return [...tabsList].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [config?.tabs]);

  const enabledTabs = useMemo(() => {
    return (sortedTabs || []).filter(t => t.isEnabled);
  }, [sortedTabs]);

  // Handler to update top-level config properties
  const updateConfigField = <K extends keyof BottomNavConfig>(field: K, value: BottomNavConfig[K]) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setSelectedPresetId(null);
  };

  // Toggle tab enabled state
  const handleToggleTab = (id: string) => {
    setConfig(prev => {
      const currentTabs = Array.isArray(prev?.tabs) && prev.tabs.length > 0 ? prev.tabs : DEFAULT_BOTTOM_NAV_CONFIG.tabs;
      const updated = currentTabs.map(tab => {
        if (tab.id === id) {
          return { ...tab, isEnabled: !tab.isEnabled };
        }
        return tab;
      });
      return { ...prev, tabs: updated };
    });
    setSelectedPresetId(null);
  };

  // Move tab up in order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newTabs = [...sortedTabs];
    const temp = newTabs[index];
    newTabs[index] = newTabs[index - 1];
    newTabs[index - 1] = temp;

    // Reassign sequential orders
    const reordered = newTabs.map((t, idx) => ({ ...t, order: idx }));
    setConfig(prev => ({ ...prev, tabs: reordered }));
    setSelectedPresetId(null);
  };

  // Move tab down in order
  const handleMoveDown = (index: number) => {
    if (index >= sortedTabs.length - 1) return;
    const newTabs = [...sortedTabs];
    const temp = newTabs[index];
    newTabs[index] = newTabs[index + 1];
    newTabs[index + 1] = temp;

    // Reassign sequential orders
    const reordered = newTabs.map((t, idx) => ({ ...t, order: idx }));
    setConfig(prev => ({ ...prev, tabs: reordered }));
    setSelectedPresetId(null);
  };

  // Update custom label for a tab
  const handleCustomLabelChange = (id: string, customLabel: string) => {
    setConfig(prev => {
      const updated = prev.tabs.map(tab => {
        if (tab.id === id) {
          return { ...tab, customLabel };
        }
        return tab;
      });
      return { ...prev, tabs: updated };
    });
    setSelectedPresetId(null);
  };

  // Apply a template preset
  const handleApplyPreset = (preset: typeof BOTTOM_NAV_PRESETS[0]) => {
    setConfig({ ...preset.config });
    setSelectedPresetId(preset.id);
    showToast('success', 'Preset Applied', `Loaded "${preset.name}" bottom navigation configuration.`);
  };

  // Reset to default
  const handleResetToDefault = () => {
    setConfig(DEFAULT_BOTTOM_NAV_CONFIG);
    setSelectedPresetId('STANDARD_BALANCED');
    showToast('info', 'Reset Complete', 'Bottom navigation settings restored to default standard configuration.');
  };

  // Save changes to business profile and system
  const handleSave = () => {
    // Basic validation: ensure at least 2 tabs are enabled
    const currentTabs = Array.isArray(config?.tabs) ? config.tabs : DEFAULT_BOTTOM_NAV_CONFIG.tabs;
    const activeCount = currentTabs.filter(t => t.isEnabled).length;
    if (activeCount < 2) {
      showToast('error', 'Too Few Tabs', 'Please enable at least 2 navigation tabs for the bottom bar.');
      return;
    }

    updateBusiness({
      bottomNavConfig: config
    }, true);

    showToast('success', 'Navigation Settings Saved', 'Bottom navigation bar updated across all mobile & tablet views.');
    if (onSaved) onSaved();
  };

  // Quick Action items toggle
  const toggleQuickActionItem = (itemType: QuickActionType) => {
    const current = config.quickActionItems || ['invoice', 'pos', 'payment_in'];
    const exists = current.includes(itemType);
    const updated = exists 
      ? current.filter(item => item !== itemType)
      : [...current, itemType];

    if (updated.length === 0) {
      showToast('warning', 'Minimum Action Required', 'Please keep at least 1 quick action shortcut enabled.');
      return;
    }

    updateConfigField('quickActionItems', updated);
  };

  // Helper to find tab meta
  const getTabMeta = (id: string): TabMetaDefinition => {
    return ALL_AVAILABLE_NAV_TABS.find(t => t.id === id) || {
      id,
      defaultLabel: id,
      shortLabel: id,
      description: '',
      icon: Layers
    };
  };

  const quickActionMeta: Record<QuickActionType, { label: string; icon: React.ElementType; color: string }> = {
    invoice: { label: 'New Tax Invoice', icon: FileText, color: 'bg-indigo-600' },
    pos: { label: 'POS Quick Sale', icon: ShoppingCart, color: 'bg-emerald-600' },
    payment_in: { label: 'Customer Payment In', icon: Receipt, color: 'bg-teal-600' },
    payment_out: { label: 'Vendor Payment Out', icon: Receipt, color: 'bg-rose-600' },
    product: { label: 'Add Stock / Product', icon: Package, color: 'bg-amber-600' },
    party: { label: 'Add Customer / Vendor', icon: Users, color: 'bg-blue-600' },
    expense: { label: 'Record Business Expense', icon: Truck, color: 'bg-purple-600' }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/60">
                Company & Mobile UI Settings
              </span>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Customizable Bottom Navigation Bar
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Tailor the mobile & tablet bottom navigation bar to match your company's daily workflow. 
            Choose which modules appear, customize tab labels, reorder priority, pick docked or floating pill styles, and enable the center Quick Action button.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Preset Profiles Selector */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Smart Workflow Presets</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an industry-optimized preset or customize each tab below
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {enabledTabs.length} Tabs Active on Bottom Bar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BOTTOM_NAV_PRESETS.map(preset => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">{preset.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                    {preset.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {(preset.config.tabs || []).filter(t => t.isEnabled).slice(0, 4).map(tab => {
                      const meta = getTabMeta(tab.id);
                      const Icon = meta.icon;
                      return (
                        <div key={tab.id} className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300" title={tab.label}>
                          <Icon className="w-3 h-3" />
                        </div>
                      );
                    })}
                    {(preset.config.tabs || []).filter(t => t.isEnabled).length > 4 && (
                      <span className="text-[10px] text-slate-400 font-bold ml-0.5">
                        +{(preset.config.tabs || []).filter(t => t.isEnabled).length - 4}
                      </span>
                    )}
                  </div>

                  <span className={`text-[11px] font-bold flex items-center gap-1 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                    <span>{isSelected ? 'Applied' : 'Apply'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout: Live Simulator + Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Mobile Viewport Simulator */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-slate-950 p-5 rounded-3xl shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-black tracking-wide text-white">Interactive Mobile Simulator</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Preview
              </span>
            </div>

            {/* Simulated Phone Shell */}
            <div className="w-full bg-slate-900 rounded-2xl border-2 border-slate-700/80 overflow-hidden shadow-inner flex flex-col h-[480px] relative">
              {/* Phone Status Bar */}
              <div className="bg-slate-950 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono select-none">
                <span>09:41 AM</span>
                <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto"></div>
                <span>5G 100%</span>
              </div>

              {/* App Top Bar */}
              <div className="bg-slate-900 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white truncate max-w-[150px]">{business.tradeName || business.name}</h4>
                  <p className="text-[9px] text-slate-400 font-mono">GSTIN: {business.gstin}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                    ₹
                  </div>
                </div>
              </div>

              {/* Simulated Content Body */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <div className="text-[11px] font-bold text-white flex items-center justify-between">
                    <span>Active Tab: <strong className="text-indigo-400 uppercase">{previewActiveTab}</strong></span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300">Preview</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tap any icon below in the simulated bottom bar to preview active state animations and styles.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                    <span className="text-[10px] text-slate-400">Total Sales</span>
                    <p className="text-xs font-bold text-white mt-0.5">₹ 14,82,450</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                    <span className="text-[10px] text-slate-400">Receivables</span>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">₹ 2,45,100</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Activity</span>
                  <div className="text-[10px] text-slate-300 flex items-center justify-between">
                    <span>INV-2026-00104</span>
                    <span className="font-semibold text-emerald-400">₹ 42,500</span>
                  </div>
                  <div className="text-[10px] text-slate-300 flex items-center justify-between">
                    <span>POS Counter Bill #89</span>
                    <span className="font-semibold text-indigo-400">₹ 3,450</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Popover Simulator */}
              <AnimatePresence>
                {previewQuickActionOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="absolute inset-x-3 bottom-16 z-30 p-3 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Quick Create Action
                      </span>
                      <button
                        onClick={() => setPreviewQuickActionOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {(config.quickActionItems || ['invoice', 'pos', 'payment_in']).map(action => {
                        const meta = quickActionMeta[action];
                        if (!meta) return null;
                        const Icon = meta.icon;
                        return (
                          <div 
                            key={action}
                            onClick={() => {
                              setPreviewQuickActionOpen(false);
                              if (action === 'invoice') setPreviewActiveTab('invoices');
                              if (action === 'pos') setPreviewActiveTab('pos_billing');
                              if (action === 'payment_in' || action === 'payment_out') setPreviewActiveTab('payments');
                              if (action === 'product') setPreviewActiveTab('inventory');
                              if (action === 'party') setPreviewActiveTab('parties');
                              if (action === 'expense') setPreviewActiveTab('purchases');
                            }}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <div className={`w-6 h-6 rounded-lg ${meta.color} text-white flex items-center justify-center shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-200 truncate">{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SIMULATED BOTTOM NAVIGATION BAR */}
              {config.enabled ? (
                <div className={`w-full z-20 transition-all ${
                  config.style === 'LIQUID_GLASS' || config.style === 'FLOATING_PILL'
                    ? 'p-2'
                    : config.style === 'MODERN_CURVED'
                    ? 'rounded-t-2xl border-t border-slate-700/80 bg-slate-900/95'
                    : config.style === 'COMPACT_SLIM'
                    ? 'border-t border-slate-800 bg-slate-900 py-1'
                    : 'border-t border-slate-800 bg-slate-900/95'
                }`}>
                  <div className={`flex items-center justify-around ${
                    config.style === 'LIQUID_GLASS'
                      ? 'relative overflow-hidden bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/10'
                      : config.style === 'FLOATING_PILL'
                      ? 'bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 px-2 py-1.5 shadow-lg'
                      : 'px-2 py-1'
                  }`}>
                    {config.style === 'LIQUID_GLASS' && (
                      <div 
                        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
                        style={{
                          background: `linear-gradient(to right, transparent, ${palette.hex}99, transparent)`
                        }}
                      />
                    )}

                    {/* Render active tabs with center button if enabled */}
                    {(() => {
                      const itemsToRender = [...enabledTabs];
                      const middleIndex = Math.floor(itemsToRender.length / 2);

                      const renderedNodes = itemsToRender.map((tab, idx) => {
                        const meta = getTabMeta(tab.id);
                        const Icon = meta.icon;
                        const labelToDisplay = tab.customLabel?.trim() || tab.label || meta.shortLabel;
                        const isActive = previewActiveTab === tab.id;

                        const tabButton = (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPreviewActiveTab(tab.id)}
                            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                              isActive
                                ? `${palette.textClass} font-bold`
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="previewNavPill"
                                className={
                                  config.style === 'LIQUID_GLASS'
                                    ? `absolute inset-0 bg-gradient-to-tr ${palette.glassGradientClass} border ${palette.glassBorderClass} backdrop-blur-md rounded-xl shadow-sm -z-10`
                                    : `absolute inset-0 ${palette.lightBgClass} rounded-xl -z-10`
                                }
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              />
                            )}
                            <div className="relative">
                              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                              {config.showBadges && (tab.id === 'inventory' || tab.id === 'gst_returns') && (
                                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-slate-900"></span>
                              )}
                            </div>
                            {config.showLabels && (
                              <span className="text-[9px] mt-0.5 truncate max-w-[54px]">{labelToDisplay}</span>
                            )}
                          </button>
                        );

                        // Insert Center Action Button right in middle if enabled
                        if (config.showQuickActionCenter && idx === middleIndex) {
                          return (
                            <React.Fragment key={`group-${tab.id}`}>
                              <button
                                key="center-fab-btn"
                                type="button"
                                onClick={() => setPreviewQuickActionOpen(prev => !prev)}
                                className={`relative -top-2 flex flex-col items-center justify-center p-2 rounded-full text-white shadow-lg border-2 border-slate-900 cursor-pointer active:scale-95 transition-all ${palette.gradientClass} ring-2 ${palette.ringClass}`}
                                title="Quick Create Action"
                              >
                                <Plus className={`w-4 h-4 transition-transform duration-200 ${previewQuickActionOpen ? 'rotate-45' : ''}`} />
                              </button>
                              {tabButton}
                            </React.Fragment>
                          );
                        }

                        return tabButton;
                      });

                      // Also include "More" button if enabled
                      if (config.showMoreDrawerButton) {
                        renderedNodes.push(
                          <button
                            key="more-drawer-btn"
                            type="button"
                            onClick={() => showToast('info', 'Drawer Menu', 'Tapping "More" opens the full slide-out navigation menu.')}
                            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Menu className="w-4 h-4 stroke-2" />
                            {config.showLabels && <span className="text-[9px] mt-0.5">More</span>}
                          </button>
                        );
                      }

                      return renderedNodes;
                    })()}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center bg-slate-950 text-slate-500 text-[11px] border-t border-slate-800">
                  Bottom Navigation Bar is currently Disabled
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Style: <strong className="text-white">{config.style.replace('_', ' ')}</strong></span>
              <span>Enabled: <strong className="text-white">{enabledTabs.length} of {config.tabs.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls & Tab Ordering Table */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Visual Style & Behavior Toggles */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Navigation Bar Style & Layout</span>
              </h3>
              {config.style === 'LIQUID_GLASS' && (
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-500" /> Liquid Glass Active
                </span>
              )}
            </div>

            {/* Style Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { id: 'LIQUID_GLASS', label: 'Liquid Glass', desc: 'Frosted Glass Morphism', isHighlight: true },
                { id: 'FLOATING_PILL', label: 'Floating Pill', desc: 'Modern Capsule' },
                { id: 'CLASSIC_DOCKED', label: 'Classic Docked', desc: 'Edge-to-Edge' },
                { id: 'MODERN_CURVED', label: 'Curved Top', desc: 'Soft Rounded' },
                { id: 'COMPACT_SLIM', label: 'Compact Slim', desc: 'Low Profile' }
              ].map(st => {
                const isActive = config.style === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateConfigField('style', st.id as BottomNavStyle)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                      isActive
                        ? st.id === 'LIQUID_GLASS'
                          ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 shadow-xs ring-2 ring-cyan-500/20'
                          : 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {st.isHighlight && (
                      <span className="absolute -top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xs">
                        Glossy
                      </span>
                    )}
                    <div className="text-xs font-bold">{st.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{st.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Theme & Accent Color Auto-Match */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Bottom Navigation Theme Color</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Active: <strong className="text-slate-800 dark:text-slate-200">{config.color && config.color !== 'auto' ? palette.name : `Auto (${palette.name})`}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => updateConfigField('color', 'auto')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    !config.color || config.color === 'auto'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full" 
                      style={{ backgroundColor: palette.hex }}
                    />
                    <span>Auto (App Theme)</span>
                  </div>
                  {(!config.color || config.color === 'auto') && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>

                {Object.values(THEME_PALETTES).map(pal => {
                  const isSelected = config.color === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => updateConfigField('color', pal.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full" 
                          style={{ backgroundColor: pal.hex }}
                        />
                        <span className="truncate">{pal.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Enable Bottom Nav Bar</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Show on mobile & tablet screens</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => updateConfigField('enabled', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Show Text Labels</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Display labels below icons</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showLabels}
                  onChange={e => updateConfigField('showLabels', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Center Quick Action FAB (+)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Floating center shortcut button</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showQuickActionCenter}
                  onChange={e => updateConfigField('showQuickActionCenter', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Show Alert Badges</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Low stock & pending indicators</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showBadges}
                  onChange={e => updateConfigField('showBadges', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Quick Action Item Selection (if Center FAB is active) */}
            {config.showQuickActionCenter && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>Quick Action FAB Shortcuts</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
                    {(config.quickActionItems || []).length} Selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Select shortcuts that appear in the center popup when tapping the floating "+" action button:
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(['invoice', 'pos', 'payment_in', 'payment_out', 'product', 'party', 'expense'] as QuickActionType[]).map(actionKey => {
                    const meta = quickActionMeta[actionKey];
                    const isChecked = (config.quickActionItems || []).includes(actionKey);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={actionKey}
                        type="button"
                        onClick={() => toggleQuickActionItem(actionKey)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{meta.label}</span>
                        {isChecked && <Check className="w-3 h-3 stroke-[3] ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs Selector & Reordering Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Configure Bottom Bar Tabs & Order</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Toggle visibility and arrange the order using the Up/Down controls.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  enabledTabs.length >= 4 && enabledTabs.length <= 5
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : enabledTabs.length > 5
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {enabledTabs.length} Tabs on Bar {enabledTabs.length > 5 ? '(Dense)' : enabledTabs.length >= 4 ? '(Recommended)' : ''}
                </span>
              </div>
            </div>

            {/* Tab Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedTabs.map((tab, index) => {
                const meta = getTabMeta(tab.id);
                const Icon = meta.icon;
                const isEnabled = tab.isEnabled;

                return (
                  <div
                    key={tab.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isEnabled 
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40' 
                        : 'bg-slate-50/50 dark:bg-slate-950/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Left: Reorder controls + Icon + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Move tab left/earlier in bar"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === sortedTabs.length - 1}
                          onClick={() => handleMoveDown(index)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Move tab right/later in bar"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isEnabled
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Info & Custom Label Input */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {meta.defaultLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            #{index + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Custom Display Title Input + Enable Toggle */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">Title:</span>
                        <input
                          type="text"
                          value={tab.customLabel !== undefined ? tab.customLabel : tab.label}
                          placeholder={meta.shortLabel}
                          onChange={e => handleCustomLabelChange(tab.id, e.target.value)}
                          className="w-28 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleTab(tab.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isEnabled ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>In Bar</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>In Drawer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Tabs marked "In Drawer" remain accessible via the "More" slide-out menu.</span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Navigation Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
