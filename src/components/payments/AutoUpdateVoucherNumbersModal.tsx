import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentRecord, PaymentType } from '../../types';
import { formatVoucherSequence } from '../../utils/voucherNumberUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DesktopModal } from '../common/DesktopModal';
import { 
  Hash, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  ArrowRight, 
  Sparkles, 
  Receipt,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
  Search
} from 'lucide-react';

interface AutoUpdateVoucherNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: PaymentType;
}

export const AutoUpdateVoucherNumbersModal: React.FC<AutoUpdateVoucherNumbersModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'PAYMENT_IN'
}) => {
  const { 
    payments, 
    business, 
    resequenceAllVouchersFromStartingNumber,
    showToast 
  } = useApp();

  const isUnified = business.voucherNumberingMode === 'UNIFIED';
  const [selectedType, setSelectedType] = useState<PaymentType>(defaultType || 'PAYMENT_IN');

  const getInitialPrefix = (type: PaymentType = 'PAYMENT_IN') => {
    if (isUnified) return business.voucherUnifiedPrefix || 'VCH-';
    if (type === 'PAYMENT_IN') return business.paymentReceiptPrefix || 'RCPT-';
    if (type === 'PAYMENT_OUT') return business.paymentVoucherPrefix || 'PMT-';
    return business.contraVoucherPrefix || 'CNTR-';
  };

  const getInitialSeq = (type: PaymentType = 'PAYMENT_IN') => {
    if (isUnified) return Math.max(1, parseInt(String(business.nextUnifiedVoucherNumber || 1), 10) || 1);
    if (type === 'PAYMENT_IN') return Math.max(1, parseInt(String(business.nextPaymentReceiptNumber || 1), 10) || 1);
    if (type === 'PAYMENT_OUT') return Math.max(1, parseInt(String(business.nextPaymentVoucherNumber || 1), 10) || 1);
    return Math.max(1, parseInt(String(business.nextContraVoucherNumber || 1), 10) || 1);
  };

  const [prefix, setPrefix] = useState<string>(() => getInitialPrefix((defaultType || 'PAYMENT_IN') as PaymentType));
  const [startingNumber, setStartingNumber] = useState<number>(() => getInitialSeq((defaultType || 'PAYMENT_IN') as PaymentType));
  const [sortBy, setSortBy] = useState<'date' | 'created'>('date');
  const [isApplying, setIsApplying] = useState(false);
  const [searchPreview, setSearchPreview] = useState('');

  // Update values when type or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setPrefix(getInitialPrefix(selectedType));
      setStartingNumber(getInitialSeq(selectedType));
    }
  }, [isOpen, selectedType, isUnified, business]);

  // Compute sorted payments and live preview mapping
  const previewData = useMemo(() => {
    const targetPayments = isUnified ? payments : payments.filter(p => p.type === selectedType);

    const sorted = [...targetPayments].sort((a, b) => {
      if (sortBy === 'created') {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return timeA - timeB;
      }
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    const start = Math.max(1, startingNumber || 1);
    const mapped = sorted.map((p, idx) => {
      const newSeq = start + idx;
      const newVoucherNumber = formatVoucherSequence(prefix, newSeq);
      return {
        payment: p,
        originalNumber: p.voucherNumber || '—',
        newNumber: newVoucherNumber,
        newSequence: newSeq,
        isChanged: (p.voucherNumber || '').trim().toLowerCase() !== newVoucherNumber.trim().toLowerCase()
      };
    });

    const filtered = searchPreview.trim()
      ? mapped.filter(item => 
          item.originalNumber.toLowerCase().includes(searchPreview.toLowerCase()) ||
          item.newNumber.toLowerCase().includes(searchPreview.toLowerCase()) ||
          (item.payment.partyName || '').toLowerCase().includes(searchPreview.toLowerCase())
        )
      : mapped;

    return {
      all: mapped,
      filtered,
      totalCount: mapped.length,
      changedCount: mapped.filter(m => m.isChanged).length,
      startNumberFormatted: formatVoucherSequence(prefix, start),
      endNumberFormatted: formatVoucherSequence(prefix, start + Math.max(0, mapped.length - 1)),
      nextAvailableFormatted: formatVoucherSequence(prefix, start + mapped.length)
    };
  }, [payments, isUnified, selectedType, sortBy, startingNumber, prefix, searchPreview]);

  const handleApplyResequence = async () => {
    setIsApplying(true);
    try {
      const res = await resequenceAllVouchersFromStartingNumber({
        startingNumber,
        prefix,
        type: isUnified ? undefined : selectedType,
        sortBy
      });

      showToast(
        'success',
        'Vouchers Resequenced Successfully',
        `Updated ${res.updatedCount} vouchers. Next available voucher will be ${res.nextVoucherNo}.`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Resequence Failed', err?.message || 'Unable to re-sequence vouchers.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <DesktopModal
      isOpen={isOpen}
      onClose={onClose}
      id="auto-resequence-vouchers-modal"
      size="xl"
      title="Auto-Resequence Payment Vouchers"
      subtitle="Fix duplicate numbers, missing sequences, and enforce chronological voucher numbering"
      badge={
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          Sequential Audit
        </span>
      }
      icon={<Receipt className="w-5 h-5" />}
      iconBgColor="bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/50"
      bodyClassName="space-y-6 text-xs"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyResequence}
            disabled={isApplying || previewData.totalCount === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {isApplying ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Sequence...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply Sequential Numbering</span>
              </>
            )}
          </button>
        </>
      }
    >
      {/* Voucher Type Selector (if separate series) */}
          {!isUnified && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Select Voucher Category to Resequence
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType('PAYMENT_IN')}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedType === 'PAYMENT_IN'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Payment Receipts (Money In)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('PAYMENT_OUT')}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedType === 'PAYMENT_OUT'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Payment Vouchers (Money Out)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('CONTRA_TRANSFER')}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedType === 'CONTRA_TRANSFER'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Contra Transfers</span>
                </button>
              </div>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
              <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Series Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Voucher Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. RCPT-, PMT-, or leave empty"
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-teal-500 placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Starting Serial Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Sort Order Before Numbering
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'created')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer font-medium"
                >
                  <option value="date">Voucher Date (Chronological)</option>
                  <option value="created">Created Timestamp (Exact Order)</option>
                </select>
              </div>
            </div>

            {/* Sequence summary badges */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
              <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Total Vouchers: <span className="font-bold text-slate-900 dark:text-white">{previewData.totalCount}</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                Range: <span className="font-mono font-bold">{previewData.startNumberFormatted}</span> → <span className="font-mono font-bold">{previewData.endNumberFormatted}</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                Next Active Voucher: <span className="font-mono font-bold">{previewData.nextAvailableFormatted}</span>
              </div>
              {previewData.changedCount > 0 && (
                <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  <span className="font-bold">{previewData.changedCount}</span> voucher(s) will be updated
                </div>
              )}
            </div>
          </div>

          {/* Search Preview */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPreview}
                onChange={(e) => setSearchPreview(e.target.value)}
                placeholder="Search preview by party name, original or new voucher #..."
                className="w-full pl-8 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchPreview && (
                <button
                  type="button"
                  onClick={() => setSearchPreview('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              Showing {previewData.filtered.length} of {previewData.totalCount} records
            </span>
          </div>

          {/* Preview Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Party / Beneficiary</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Current Voucher #</th>
                  <th className="py-2 px-3">New Voucher #</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewData.filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No matching vouchers found.
                    </td>
                  </tr>
                ) : (
                  previewData.filtered.map((item, idx) => (
                    <tr key={`vch-${item.payment.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatDate(item.payment.date)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {item.payment.partyName || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(item.payment.amount)}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.originalNumber}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        {item.newNumber}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.isChanged ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            Update
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Unchanged
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Permanent Sequential Re-assignment:</span> Resequencing will rename existing voucher numbers in the database to align with the new sequence. Linked invoice references and ledger amounts will remain untouched.
            </div>
          </div>
    </DesktopModal>
  );
};
