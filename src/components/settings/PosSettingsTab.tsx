import React from 'react';
import { useApp } from '../../context/AppContext';
import { PosSettings } from '../../types';
import { DEFAULT_POS_SETTINGS } from '../../utils/cleanDefaults';
import {
  Printer,
  Zap,
  CheckCircle,
  Sliders,
  FileText,
  Volume2,
  VolumeX,
  Receipt,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export const PosSettingsTab: React.FC = () => {
  const { business, updateBusiness, showToast } = useApp();

  const currentPosSettings: PosSettings = {
    ...DEFAULT_POS_SETTINGS,
    ...(business.posSettings || {})
  };

  const handleToggleAutoPrint = () => {
    const nextVal = !currentPosSettings.autoPrintReceipt;
    const updated: PosSettings = {
      ...currentPosSettings,
      autoPrintReceipt: nextVal
    };

    updateBusiness({
      ...business,
      posSettings: updated
    });

    if (nextVal) {
      showToast('success', 'Auto-Print Enabled', 'Receipt preview will automatically open whenever a POS sale is finalized.');
    } else {
      showToast('info', 'Auto-Print Disabled (Fast Checkout)', 'POS sales will complete instantly without opening the print dialog, speeding up queue checkout.');
    }
  };

  const handleUpdatePaperSize = (size: '80mm' | '58mm' | 'A4') => {
    const updated: PosSettings = {
      ...currentPosSettings,
      receiptPaperSize: size
    };
    updateBusiness({
      ...business,
      posSettings: updated
    });
    showToast('success', 'Paper Format Updated', `Default POS slip format set to ${size}.`);
  };

  const handleToggleSound = () => {
    const nextVal = !currentPosSettings.soundEffects;
    const updated: PosSettings = {
      ...currentPosSettings,
      soundEffects: nextVal
    };
    updateBusiness({
      ...business,
      posSettings: updated
    });
    showToast('info', nextVal ? 'Audio Feedback Enabled' : 'Audio Feedback Muted', 'Terminal sound settings updated.');
  };

  const handleToggleFastCheckout = () => {
    const nextVal = !currentPosSettings.fastCheckoutMode;
    const updated: PosSettings = {
      ...currentPosSettings,
      fastCheckoutMode: nextVal
    };
    updateBusiness({
      ...business,
      posSettings: updated
    });
    showToast('info', nextVal ? 'Fast Checkout Mode Enabled' : 'Standard Confirmation Mode Active', 'Terminal checkout behavior updated.');
  };

  const handleResetDefaults = () => {
    updateBusiness({
      ...business,
      posSettings: { ...DEFAULT_POS_SETTINGS }
    });
    showToast('info', 'Settings Reset', 'POS settings restored to standard factory defaults.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="pos-settings-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">POS Terminal & Receipt Settings</h3>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure auto-print behaviors, thermal paper slip sizes, and cashier workflow speed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Quick-Access Feature Card: Automatic Receipt Printing */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${currentPosSettings.autoPrintReceipt ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Automatic Receipt Printing upon Sale Completion
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control whether the thermal receipt printer triggers immediately or if sales complete seamlessly
                </p>
              </div>
            </div>
          </div>

          {/* Quick-Access Toggle Switch */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              currentPosSettings.autoPrintReceipt
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {currentPosSettings.autoPrintReceipt ? 'Enabled (Auto-Print)' : 'Disabled (Fast Checkout)'}
            </span>

            <button
              type="button"
              id="pos-settings-autoprint-switch"
              onClick={handleToggleAutoPrint}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                currentPosSettings.autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={currentPosSettings.autoPrintReceipt}
              title="Toggle automatic printing"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  currentPosSettings.autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Workflow Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Option A: Auto-Print Enabled */}
          <div
            onClick={() => {
              if (!currentPosSettings.autoPrintReceipt) handleToggleAutoPrint();
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              currentPosSettings.autoPrintReceipt
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Automatic Print Mode (Retail Standard)
              </span>
              {currentPosSettings.autoPrintReceipt && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Active
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed mb-3">
              Best for retail stores, grocery marts, and electronics shops where every customer expects a physical paper receipt slip immediately.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>Scan Items</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>Settle Bill</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Print Opens</span>
            </div>
          </div>

          {/* Option B: Fast Checkout (Auto-Print Disabled) */}
          <div
            onClick={() => {
              if (currentPosSettings.autoPrintReceipt) handleToggleAutoPrint();
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              !currentPosSettings.autoPrintReceipt
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Streamlined Fast Checkout (Zero Interruption)
              </span>
              {!currentPosSettings.autoPrintReceipt && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Active
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed mb-3">
              Best for busy counters, cafes, quick-serve stalls, or digital-first billing. Bypasses the receipt dialog so cashiers can immediately scan the next customer's items.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>Scan Items</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>Settle Bill</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="font-bold text-amber-600 dark:text-amber-400">Instant Next Customer</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-bold">Quick-Access Note:</span> You can also toggle this setting with a single click directly inside the POS terminal header bar or right above the checkout button, without returning to this settings page!
          </p>
        </div>
      </div>

      {/* Additional POS Terminal Preferences */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Receipt Format & Hardware Preferences</span>
        </h4>

        {/* Receipt Paper Size Selector */}
        <div>
          <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-2">
            Default Receipt Print Format:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: '80mm', label: '80mm POS Thermal Slip', desc: 'Standard 3-inch roll printer (Epson, TVS, NGX)' },
              { id: '58mm', label: '58mm Mini Pocket Slip', desc: 'Compact 2-inch roll / Bluetooth mobile printer' },
              { id: 'A4', label: 'Full A4 / A5 Tax Invoice', desc: 'Standard office laser or inkjet printer' }
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => handleUpdatePaperSize(fmt.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  currentPosSettings.receiptPaperSize === fmt.id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-white font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{fmt.label}</span>
                  {currentPosSettings.receiptPaperSize === fmt.id && (
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{fmt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sound Feedback Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
              {currentPosSettings.soundEffects ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Auditory Beep Feedback
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Play pleasant audio chime when an item is scanned or sale is confirmed
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentPosSettings.soundEffects ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            role="switch"
            aria-checked={currentPosSettings.soundEffects}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                currentPosSettings.soundEffects ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Fast Checkout Confirmation Mode */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                One-Click Rapid Checkout
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Instantly finalize cash sales without intermediate confirmation prompts during rush hours
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleFastCheckout}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentPosSettings.fastCheckoutMode ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            role="switch"
            aria-checked={currentPosSettings.fastCheckoutMode}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                currentPosSettings.fastCheckoutMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
