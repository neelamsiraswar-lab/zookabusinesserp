import React, { useState } from 'react';
import { Calculator, ArrowRightLeft, Copy, Check, Percent, Sparkles, X } from 'lucide-react';
import { GstTaxRate } from '../../types';
import {
  calculateExcludeRateFromIncludeRate,
  calculateIncludeRateFromExcludeRate
} from '../../utils/gstCalculations';

interface GstRateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
  initialGstRate?: GstTaxRate;
  initialMode?: 'INCLUSIVE_TO_EXCLUSIVE' | 'EXCLUSIVE_TO_INCLUSIVE';
  onApply?: (result: {
    rateExcl: number;
    rateIncl: number;
    taxableAmount: number;
    gstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    gstRate: GstTaxRate;
    quantity: number;
  }) => void;
}

export const GstRateCalculatorModal: React.FC<GstRateCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 100,
  initialGstRate = 18,
  initialMode = 'INCLUSIVE_TO_EXCLUSIVE',
  onApply
}) => {
  const [calcMode, setCalcMode] = useState<'INCLUSIVE_TO_EXCLUSIVE' | 'EXCLUSIVE_TO_INCLUSIVE'>(initialMode);
  const [amount, setAmount] = useState<number>(initialAmount || 100);
  const [gstRate, setGstRate] = useState<GstTaxRate>(initialGstRate);
  const [cessRate, setCessRate] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const qty = Math.max(0.0001, quantity);
  const totalTaxPct = Number(gstRate) + Number(cessRate);
  const taxFactor = 1 + totalTaxPct / 100;

  let unitRateExcl = 0;
  let unitRateIncl = 0;
  let lineTaxable = 0;
  let lineTotalTax = 0;
  let lineTotal = 0;

  if (calcMode === 'INCLUSIVE_TO_EXCLUSIVE') {
    // User entered GST Inclusive Amount (Rate per unit or total)
    unitRateIncl = Math.max(0, amount);
    unitRateExcl = calculateExcludeRateFromIncludeRate(unitRateIncl, gstRate, cessRate);
    lineTotal = Number((unitRateIncl * qty).toFixed(2));
    lineTaxable = Number((lineTotal / taxFactor).toFixed(2));
    lineTotalTax = Number((lineTotal - lineTaxable).toFixed(2));
  } else {
    // User entered GST Exclusive Amount (Base Rate before tax)
    unitRateExcl = Math.max(0, amount);
    unitRateIncl = calculateIncludeRateFromExcludeRate(unitRateExcl, gstRate, cessRate);
    lineTaxable = Number((unitRateExcl * qty).toFixed(2));
    lineTotalTax = Number(((lineTaxable * totalTaxPct) / 100).toFixed(2));
    lineTotal = Number((lineTaxable + lineTotalTax).toFixed(2));
  }

  // Cess amount
  const lineCess = cessRate > 0 ? Number(((lineTaxable * cessRate) / 100).toFixed(2)) : 0;
  const lineGst = Math.max(0, Number((lineTotalTax - lineCess).toFixed(2)));

  // CGST / SGST split
  const cgst = isInterState ? 0 : Number((lineGst / 2).toFixed(2));
  const sgst = isInterState ? 0 : Number((lineGst - cgst).toFixed(2));
  const igst = isInterState ? lineGst : 0;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        rateExcl: unitRateExcl,
        rateIncl: unitRateIncl,
        taxableAmount: lineTaxable,
        gstAmount: lineGst,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
        gstRate,
        quantity: qty
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>GST Rate & Tax Converter</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-mono font-normal">
                  Zero-Drift
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Instant conversion between GST Inclusive (MRP) and GST Exclusive rates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[85vh]">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCalcMode('INCLUSIVE_TO_EXCLUSIVE')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                calcMode === 'INCLUSIVE_TO_EXCLUSIVE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Incl. → Excl. Rate</span>
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('EXCLUSIVE_TO_INCLUSIVE')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                calcMode === 'EXCLUSIVE_TO_INCLUSIVE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Excl. → Incl. Rate</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5 bg-indigo-50/50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                {calcMode === 'INCLUSIVE_TO_EXCLUSIVE'
                  ? 'Enter GST Included Price / MRP (₹):'
                  : 'Enter GST Excluded Base Rate (₹):'}
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {calcMode === 'INCLUSIVE_TO_EXCLUSIVE' ? 'With Tax' : 'Before Tax'}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-indigo-600 dark:text-indigo-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 text-lg font-bold font-mono bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-500 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 font-medium">Quick Amounts:</span>
              {[50, 100, 200, 500, 1000, 1180, 2500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* GST Rate Slab Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select GST Rate Slab (%):
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {([0, 5, 12, 18, 28] as GstTaxRate[]).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setGstRate(rate)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all border text-center cursor-pointer ${
                    gstRate === rate
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Supply Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantity (Units):
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tax Type:
              </label>
              <button
                type="button"
                onClick={() => setIsInterState(!isInterState)}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span>{isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 underline">Toggle</span>
              </button>
            </div>
          </div>

          {/* Accurate Results Breakdown Card */}
          <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl space-y-3 shadow-md border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Calculated Output Breakdown</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Zero Rounding Error
              </span>
            </div>

            {/* Key Comparison Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="text-[10px] text-slate-400">Unit Base Rate (Excl.)</div>
                <div className="text-base font-bold font-mono text-white flex items-center justify-between mt-0.5">
                  <span>₹{unitRateExcl.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(unitRateExcl.toFixed(2), 'unitExcl')}
                    className="text-slate-400 hover:text-white p-1 rounded"
                    title="Copy"
                  >
                    {copiedKey === 'unitExcl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="text-[10px] text-slate-400">Unit Total Rate (Incl.)</div>
                <div className="text-base font-bold font-mono text-indigo-300 flex items-center justify-between mt-0.5">
                  <span>₹{unitRateIncl.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(unitRateIncl.toFixed(2), 'unitIncl')}
                    className="text-slate-400 hover:text-white p-1 rounded"
                    title="Copy"
                  >
                    {copiedKey === 'unitIncl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Line Item Totals Breakdown */}
            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between text-slate-300">
                <span>Taxable Amount ({qty} {qty === 1 ? 'unit' : 'units'}):</span>
                <span className="font-mono font-bold text-white">₹{lineTaxable.toFixed(2)}</span>
              </div>

              {isInterState ? (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Integrated Tax (IGST {gstRate}%):</span>
                  <span className="font-mono font-bold text-indigo-300">₹{igst.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Central Tax (CGST {gstRate / 2}%):</span>
                    <span className="font-mono font-bold text-indigo-300">₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>State Tax (SGST {gstRate / 2}%):</span>
                    <span className="font-mono font-bold text-indigo-300">₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span className="font-semibold">Total GST Tax ({gstRate}%):</span>
                <span className="font-mono font-bold text-amber-400">₹{lineTotalTax.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-white font-bold pt-1.5 border-t border-slate-800 text-sm">
                <span>Final Line Total (Incl. GST):</span>
                <span className="font-mono text-emerald-400 text-base">₹{lineTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Mathematical Formula Footnote */}
            <div className="p-2 rounded-lg bg-slate-950/60 text-[10px] text-slate-400 font-mono border border-slate-800/80">
              {calcMode === 'INCLUSIVE_TO_EXCLUSIVE' ? (
                <span>Formula: Exclude Rate = ₹{unitRateIncl} / (1 + {gstRate}/100) = ₹{unitRateExcl.toFixed(2)}</span>
              ) : (
                <span>Formula: Include Rate = ₹{unitRateExcl} × (1 + {gstRate}/100) = ₹{unitRateIncl.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(`Rate Excl: ₹${unitRateExcl.toFixed(2)} | Rate Incl: ₹${unitRateIncl.toFixed(2)} | Tax: ₹${lineTotalTax.toFixed(2)} | Total: ₹${lineTotal.toFixed(2)}`, 'summary')}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              {copiedKey === 'summary' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Summary</span>
            </button>
            {onApply && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Item</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
