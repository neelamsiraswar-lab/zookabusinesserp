import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LowStockSettings, LowStockBehavior } from '../../types';
import { 
  Package, 
  AlertTriangle, 
  ShieldAlert, 
  Bell, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Layers, 
  ShoppingCart, 
  TrendingDown, 
  Zap, 
  Save, 
  Sparkles,
  Info,
  Check,
  Ban,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Cloud,
  CloudCheck,
  RotateCcw
} from 'lucide-react';
import { 
  DEFAULT_LOW_STOCK_SETTINGS, 
  normalizeLowStockSettings, 
  computeInventoryHealth,
  isProductLowStock,
  isProductCriticalStock,
  isProductOutOfStock
} from '../../utils/stockUtils';

interface LowStockSettingsTabProps {
  formData?: any;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  onSave?: () => void;
  isSaving?: boolean;
}

export const LowStockSettingsTab: React.FC<LowStockSettingsTabProps> = ({
  formData,
  setFormData,
  onSave,
  isSaving: parentIsSaving = false,
}) => {
  const { 
    business,
    updateBusiness,
    updateLowStockSettings,
    bulkUpdateProductThresholds,
    products, 
    showToast, 
    setActiveTab,
    currentUser,
    can,
    cloudSyncStatus,
    isCloudSyncing,
    triggerCloudSync
  } = useApp();

  const isCurrentUserAdmin = 
    currentUser.role === 'ADMIN' || 
    currentUser.role === 'SUPER_ADMIN' || 
    can('settings', 'updateBusinessProfile') ||
    can('settings', 'manageUsersAndRoles');

  // Initialize local settings from business profile or parent formData
  const [localSettings, setLocalSettings] = useState<LowStockSettings>(() => {
    if (formData?.lowStockSettings) {
      return normalizeLowStockSettings(formData.lowStockSettings);
    }
    return normalizeLowStockSettings(business.lowStockSettings || DEFAULT_LOW_STOCK_SETTINGS);
  });

  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isApplyingBulkThreshold, setIsApplyingBulkThreshold] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

  // Sync state whenever business profile changes from Firestore or parent formData updates
  useEffect(() => {
    if (formData?.lowStockSettings) {
      setLocalSettings(normalizeLowStockSettings(formData.lowStockSettings));
    } else if (business?.lowStockSettings) {
      setLocalSettings(normalizeLowStockSettings(business.lowStockSettings));
    }
  }, [business?.lowStockSettings, formData?.lowStockSettings]);

  const health = computeInventoryHealth(products, localSettings);

  const updateSetting = <K extends keyof LowStockSettings>(key: K, value: LowStockSettings[K]) => {
    if (!isCurrentUserAdmin) return;
    const updated = {
      ...localSettings,
      [key]: value,
    };
    const normalized = normalizeLowStockSettings(updated);
    setLocalSettings(normalized);

    // Keep parent formData synchronized if supplied
    if (setFormData) {
      setFormData((prev: any) => ({
        ...prev,
        lowStockSettings: normalized,
      }));
    }
  };

  const handleSaveSettings = async () => {
    if (!isCurrentUserAdmin) {
      showToast('error', 'Permission Denied', 'Only administrators can update inventory monitoring policies.');
      return;
    }

    setIsSavingLocal(true);
    try {
      const normalized = normalizeLowStockSettings(localSettings);
      await updateLowStockSettings(normalized);

      if (onSave) {
        onSave();
      }
    } catch (e) {
      showToast('error', 'Save Failed', 'Could not persist low stock settings to Cloud Firestore.');
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!isCurrentUserAdmin) return;
    setLocalSettings(DEFAULT_LOW_STOCK_SETTINGS);
    if (setFormData) {
      setFormData((prev: any) => ({
        ...prev,
        lowStockSettings: DEFAULT_LOW_STOCK_SETTINGS,
      }));
    }
    await updateLowStockSettings(DEFAULT_LOW_STOCK_SETTINGS);
    showToast('info', 'Defaults Restored', 'Low stock settings restored to standard recommended thresholds.');
  };

  const handleApplyThresholdToAll = async () => {
    if (!isCurrentUserAdmin) return;
    setIsApplyingBulkThreshold(true);
    try {
      const res = await bulkUpdateProductThresholds(localSettings.defaultThreshold);
      setShowBulkConfirmModal(false);
    } catch (e) {
      showToast('error', 'Update Failed', 'Failed to update stock thresholds across catalog in Cloud Firestore.');
    } finally {
      setIsApplyingBulkThreshold(false);
    }
  };

  const handleTestAlert = () => {
    const lowStockItems = products.filter(p => isProductLowStock(p, localSettings));
    if (lowStockItems.length > 0) {
      const sample = lowStockItems.slice(0, 3).map(i => `${i.name} (${i.currentStock} ${i.unit})`).join(', ');
      showToast(
        'warning',
        `⚠️ Low Stock Alert (${lowStockItems.length} items)`,
        `Restock required for: ${sample}${lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : ''}`
      );
    } else {
      showToast(
        'info',
        'Stock Engine Healthy',
        `All physical inventory items are currently above the threshold of ${localSettings.defaultThreshold} units.`
      );
    }
  };

  const handleExportReorderReport = () => {
    const lowItems = products.filter(p => isProductLowStock(p, localSettings));
    if (lowItems.length === 0) {
      showToast('info', 'No Reorder Needed', 'All inventory stock levels are healthy.');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Min Alert Limit', 'Suggested Reorder Qty', 'Unit Purchase Price', 'Estimated Reorder Cost'];
    const rows = lowItems.map(p => {
      const needed = Math.max(1, (localSettings.defaultThreshold * (localSettings.defaultReorderMultiplier || 2)) - p.currentStock);
      const estCost = needed * (p.purchasePrice || 0);
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku || ''}"`,
        `"${p.category || 'General'}"`,
        p.currentStock,
        p.minStockAlert || localSettings.defaultThreshold,
        needed,
        p.purchasePrice || 0,
        estCost.toFixed(2)
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Low_Stock_Reorder_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Report Exported', `Generated reorder procurement list for ${lowItems.length} low-stock items.`);
  };

  const isBusySaving = parentIsSaving || isSavingLocal;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Inventory Health Overview & Cloud Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg md:text-xl font-black tracking-tight text-white">
                Low Stock & Inventory Control Engine
              </h3>
              <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                localSettings.enabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {localSettings.enabled ? 'ACTIVE MONITORING' : 'MONITORING DISABLED'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                <Cloud className="w-3 h-3 text-cyan-400" />
                <span>Firestore Synced</span>
              </span>
            </div>
            <p className="text-xs md:text-sm text-indigo-200/80 max-w-2xl">
              Automated threshold monitoring, out-of-stock billing guards, reorder alerts, and POS counter preventions synchronized across all branches.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={!isCurrentUserAdmin || isBusySaving}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/15 cursor-pointer disabled:opacity-50"
            title="Reset low stock parameters to recommended defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleTestAlert}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-400/30 cursor-pointer"
            title="Trigger a live low-stock notification test"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300" />
            <span>Test Alert</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={!isCurrentUserAdmin || isBusySaving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isBusySaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Cloud...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Stock Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Inventory Health Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
            <span>Tracked Items</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{health.physicalItems}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{health.serviceItems} service items excluded</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1">
            <span>Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{health.healthyItems}</div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Above minimum alert limit</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 text-xs font-bold mb-1">
            <span>Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{health.lowStockItems}</div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            {health.criticalItems} in critical red zone
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-400 text-xs font-bold mb-1">
            <span>Out of Stock</span>
            <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{health.outOfStockItems}</div>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">0 units available in depot</p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Master Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Master Engine & Thresholds */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Stock Alert Parameters & Limits</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure global default minimum and critical threshold quantities</p>
                </div>
              </div>

              {/* Master Enabled Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isCurrentUserAdmin}
                  checked={localSettings.enabled}
                  onChange={e => updateSetting('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Threshold */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Default Low Stock Threshold (Units)
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    Fallback Limit
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Applied to items when individual product threshold is unset or 0.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    disabled={!isCurrentUserAdmin}
                    value={localSettings.defaultThreshold}
                    onChange={e => updateSetting('defaultThreshold', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-1.5 text-sm font-bold font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1">
                    {[5, 10, 15, 25].map(val => (
                      <button
                        key={val}
                        type="button"
                        disabled={!isCurrentUserAdmin}
                        onClick={() => updateSetting('defaultThreshold', val)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          localSettings.defaultThreshold === val
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Critical Stock Threshold */}
              <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Critical Emergency Threshold</span>
                  </label>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono bg-rose-100/70 dark:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                    High Urgency
                  </span>
                </div>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                  Items at or below this level trigger pulsing red alerts and top priority reorder lists.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={localSettings.defaultThreshold}
                    disabled={!isCurrentUserAdmin}
                    value={localSettings.criticalStockThreshold}
                    onChange={e => updateSetting('criticalStockThreshold', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-1.5 text-sm font-bold font-mono text-rose-900 dark:text-rose-200 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">Units or fewer</span>
                </div>
              </div>
            </div>

            {/* Bulk Apply to all catalog action */}
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  Update all <strong>{health.physicalItems} catalog products</strong> with default threshold of <strong>{localSettings.defaultThreshold} units</strong>?
                </span>
              </div>
              <button
                type="button"
                disabled={!isCurrentUserAdmin || isApplyingBulkThreshold}
                onClick={() => setShowBulkConfirmModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
              >
                Apply to All Catalog Items
              </button>
            </div>
          </div>

          {/* Section 2: Billing & Dispatch Safeguards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Point of Sale & Billing Enforcements</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Guard against invoicing depleted goods and handle negative balances</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Negative Stock Behavior Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  When Stock Depletes (Negative Stock Policy)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'BLOCK' as LowStockBehavior,
                      title: 'Strictly Block Billing',
                      desc: 'Prevent creating invoice or POS checkout if stock is insufficient.',
                      badge: 'Recommended for Warehouses',
                      color: 'border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100',
                    },
                    {
                      id: 'WARN' as LowStockBehavior,
                      title: 'Warn & Allow Override',
                      desc: 'Display clear warning modal with option to continue billing.',
                      badge: 'Default Retail Policy',
                      color: 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100',
                    },
                    {
                      id: 'ALLOW' as LowStockBehavior,
                      title: 'Allow Without Alert',
                      desc: 'Permit unconstrained negative balances without popups.',
                      badge: 'For Fast Drop-Shipping',
                      color: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100',
                    },
                  ].map(b => (
                    <label
                      key={b.id}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        localSettings.negativeStockBehavior === b.id
                          ? `${b.color} ring-2 ring-indigo-500/20 shadow-xs`
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <input
                            type="radio"
                            name="negativeStockBehavior"
                            disabled={!isCurrentUserAdmin}
                            value={b.id}
                            checked={localSettings.negativeStockBehavior === b.id}
                            onChange={() => {
                              updateSetting('negativeStockBehavior', b.id);
                              if (b.id === 'BLOCK') {
                                updateSetting('blockBillingOnOutOfStock', true);
                                updateSetting('allowNegativeStock', false);
                              } else if (b.id === 'ALLOW') {
                                updateSetting('blockBillingOnOutOfStock', false);
                                updateSetting('allowNegativeStock', true);
                              } else {
                                updateSetting('blockBillingOnOutOfStock', false);
                                updateSetting('allowNegativeStock', true);
                              }
                            }}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {b.badge}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white mt-1">{b.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{b.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Micro-rules toggles */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2">
                <label className="py-2.5 flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Prompt Warning on Low Stock Invoicing</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Alert counter staff when an item drops into low or critical stock during active checkout.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isCurrentUserAdmin}
                    checked={localSettings.warnOnLowStockBilling}
                    onChange={e => updateSetting('warnOnLowStockBilling', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                  />
                </label>

                <label className="py-2.5 flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Hard-Block Depleted Out-of-Stock (0 Units)</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Immediately disable line-item addition in POS and Invoices when available stock is 0.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isCurrentUserAdmin}
                    checked={localSettings.blockBillingOnOutOfStock}
                    onChange={e => updateSetting('blockBillingOnOutOfStock', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Badges, Display & Automation */}
        <div className="space-y-6">
          {/* Visual Badging Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">UI Badges & Notification Banners</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Visibility of inventory status across menus</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Sidebar & Mobile Alert Badges</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Show numeric warning bubble on Inventory tab</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isCurrentUserAdmin}
                  checked={localSettings.showLowStockBadge}
                  onChange={e => updateSetting('showLowStockBadge', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Dashboard Restock Alert Banner</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Display persistent action banner on main dashboard</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isCurrentUserAdmin}
                  checked={localSettings.showDashboardBanner}
                  onChange={e => updateSetting('showDashboardBanner', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Email Digest Alerts</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Include low-stock summaries in periodic audit reports</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isCurrentUserAdmin}
                  checked={localSettings.emailAlertDigest || false}
                  onChange={e => updateSetting('emailAlertDigest', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Smart Reorder & Procurement Config */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Procurement & Auto Reorder</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Supplier replenishment parameters</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Replenishment Multiplier (Units)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    disabled={!isCurrentUserAdmin}
                    value={localSettings.defaultReorderMultiplier}
                    onChange={e => updateSetting('defaultReorderMultiplier', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs font-bold font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Units / Order</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Suggested restock volume generated when adding low-stock items to Purchase Bills.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleExportReorderReport}
                  className="w-full py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-bold border border-teal-200 dark:border-teal-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Reorder CSV ({health.lowStockItems} Items)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('purchases')}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Create Supplier Purchase Bill</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Threshold Synchronization */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Synchronize All Catalog Thresholds?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will set the minimum alert threshold of <strong>{localSettings.defaultThreshold} units</strong> across all <strong>{health.physicalItems} physical products</strong> in your inventory catalog and persist to Cloud Firestore.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApplyingBulkThreshold}
                onClick={handleApplyThresholdToAll}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isApplyingBulkThreshold ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing Cloud...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Yes, Update All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
