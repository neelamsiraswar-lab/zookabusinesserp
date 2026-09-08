import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatInvoiceSequence } from '../../utils/invoiceNumberUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Hash, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Calendar,
  Layers,
  ArrowUpDown,
  Check
} from 'lucide-react';

interface AutoUpdateInvoiceNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoUpdateInvoiceNumbersModal: React.FC<AutoUpdateInvoiceNumbersModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    invoices, 
    business, 
    currentCompany,
    resequenceAllInvoicesFromStartingNumber,
    showToast 
  } = useApp();

  const [prefix, setPrefix] = useState<string>(business.invoicePrefix || '');
  const [startingNumber, setStartingNumber] = useState<number>(() => {
    return Math.max(1, parseInt(String(business.nextInvoiceNumber || 1), 10) || 1);
  });
  const [sortBy, setSortBy] = useState<'date' | 'created'>('date');
  const [isApplying, setIsApplying] = useState(false);
  const [searchPreview, setSearchPreview] = useState('');

  // Keep synced with business whenever modal opens or business updates
  React.useEffect(() => {
    if (isOpen) {
      setPrefix(business.invoicePrefix || '');
      setStartingNumber(Math.max(1, parseInt(String(business.nextInvoiceNumber || 1), 10) || 1));
    }
  }, [isOpen, business.invoicePrefix, business.nextInvoiceNumber]);

  // Compute sorted invoices and live preview mapping
  const previewData = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      if (sortBy === 'created') {
        const timeA = new Date(a.createdAt || a.invoiceDate).getTime();
        const timeB = new Date(b.createdAt || b.invoiceDate).getTime();
        return timeA - timeB;
      }
      const dateA = new Date(a.invoiceDate).getTime();
      const dateB = new Date(b.invoiceDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    const start = Math.max(1, startingNumber || 1);
    const mapped = sorted.map((inv, idx) => {
      const newSeq = start + idx;
      const newInvoiceNumber = formatInvoiceSequence(prefix, newSeq);
      return {
        invoice: inv,
        originalNumber: inv.invoiceNumber,
        newNumber: newInvoiceNumber,
        newSequence: newSeq,
        isChanged: (inv.invoiceNumber || '').trim().toLowerCase() !== newInvoiceNumber.trim().toLowerCase()
      };
    });

    const filtered = searchPreview.trim()
      ? mapped.filter(item => 
          item.originalNumber.toLowerCase().includes(searchPreview.toLowerCase()) ||
          item.newNumber.toLowerCase().includes(searchPreview.toLowerCase()) ||
          (item.invoice.customerName || '').toLowerCase().includes(searchPreview.toLowerCase())
        )
      : mapped;

    return {
      all: mapped,
      filtered,
      totalCount: mapped.length,
      changedCount: mapped.filter(m => m.isChanged).length,
      startNumberFormatted: formatInvoiceSequence(prefix, start),
      endNumberFormatted: formatInvoiceSequence(prefix, start + Math.max(0, mapped.length - 1)),
      nextAvailableFormatted: formatInvoiceSequence(prefix, start + mapped.length)
    };
  }, [invoices, prefix, startingNumber, sortBy, searchPreview]);

  if (!isOpen) return null;

  const handleApplyResequence = async () => {
    setIsApplying(true);
    try {
      await resequenceAllInvoicesFromStartingNumber({
        startingNumber,
        prefix,
        sortBy
      });
      onClose();
    } catch (err) {
      console.error('Error re-sequencing invoices:', err);
      showToast('error', 'Update Failed', 'An error occurred while updating invoice numbers.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToCompanySettings = () => {
    setPrefix(business.invoicePrefix || '');
    setStartingNumber(Math.max(1, parseInt(String(business.nextInvoiceNumber || 1), 10) || 1));
    showToast('info', 'Settings Synced', 'Restored prefix and starting number from company profile.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto modal-overlay animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-[96vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-md">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Auto-Update Invoice Numbers from Starting Sequence
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Company & System Settings
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Re-number all tax invoices in continuous chronological order starting from company starting number
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Company Settings Synced Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs block">
                  Active Company: {currentCompany?.tradeName || business.tradeName || business.name}
                </span>
                <span className="text-[11px] text-indigo-800 dark:text-indigo-300">
                  Configured Starting Serial in Profile: <strong className="font-mono">{formatInvoiceSequence(business.invoicePrefix, business.nextInvoiceNumber)}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToCompanySettings}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load from Settings</span>
            </button>
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. INV- or INV/26-27/ (Optional)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Leave empty for plain numbers (e.g. 1001, 1002)</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Starting Invoice Number *
              </label>
              <input
                type="number"
                min={1}
                value={startingNumber}
                onChange={(e) => setStartingNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">First invoice in sequence will receive this number</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chronological Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'created')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="date">Invoice Date (Chronological)</option>
                <option value="created">Created Timestamp</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Invoices will be assigned sequentially by this order</p>
            </div>
          </div>

          {/* Sequence Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Invoices</span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">{previewData.totalCount}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Starting Number</span>
              <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">{previewData.startNumberFormatted}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Last Invoiced Number</span>
              <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {previewData.totalCount > 0 ? previewData.endNumberFormatted : 'N/A'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-medium">Next New Invoice #</span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">{previewData.nextAvailableFormatted}</span>
            </div>
          </div>

          {/* Live Before & After Table Preview */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Live Before & After Sequence Preview
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-bold text-[10px]">
                  {previewData.changedCount} to update
                </span>
              </div>

              <input
                type="text"
                value={searchPreview}
                onChange={(e) => setSearchPreview(e.target.value)}
                placeholder="Filter preview list..."
                className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
              />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3 font-semibold w-12 text-center">#</th>
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold">Customer / Party</th>
                    <th className="py-2 px-3 font-semibold">Current Invoice #</th>
                    <th className="py-2 px-3 font-semibold text-center w-8"></th>
                    <th className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">New Auto Invoice #</th>
                    <th className="py-2 px-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewData.filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        {invoices.length === 0 ? 'No invoices found in billing list.' : 'No invoices match preview search filter.'}
                      </td>
                    </tr>
                  ) : (
                    previewData.filtered.map((item, index) => (
                      <tr 
                        key={item.invoice.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          item.isChanged ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(item.invoice.invoiceDate)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {item.invoice.customerName || 'Walk-in Customer'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">
                          {item.originalNumber}
                        </td>
                        <td className="py-2 px-1 text-center text-slate-300 dark:text-slate-600">
                          <ArrowRight className="w-3.5 h-3.5 mx-auto text-indigo-500" />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800">
                            {item.newNumber}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {formatCurrency(item.invoice.grandTotal || 0, business.currencySymbol)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-300 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Applying this update will re-assign continuous consecutive invoice numbers to all invoices and synchronize the next available serial with Company & System settings.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {previewData.totalCount} invoices ready for sequential auto-update
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyResequence}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              <Check className="w-4 h-4" />
              <span>{isApplying ? 'Applying Update...' : 'Apply & Auto-Update Invoices'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
