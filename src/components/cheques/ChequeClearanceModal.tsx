import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Landmark, 
  Calendar, 
  Hash, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { ChequeRecord, ChequeClearancePayload } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';

interface ChequeClearanceModalProps {
  isOpen: boolean;
  cheque: ChequeRecord | null;
  currencySymbol?: string;
  onClose: () => void;
  onConfirmClearance: (id: string, payload: ChequeClearancePayload) => void;
}

export const ChequeClearanceModal: React.FC<ChequeClearanceModalProps> = ({
  isOpen,
  cheque,
  currencySymbol = '₹',
  onClose,
  onConfirmClearance
}) => {
  const [clearedAt, setClearedAt] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [clearanceReference, setClearanceReference] = useState<string>('');
  const [clearanceNotes, setClearanceNotes] = useState<string>('');

  useEffect(() => {
    if (cheque) {
      setClearedAt(new Date().toISOString().split('T')[0]);
      setClearanceReference(cheque.clearanceReference || '');
      setClearanceNotes(cheque.clearanceNotes || '');
    }
  }, [cheque]);

  if (!isOpen || !cheque) return null;

  const isMoneyIn = cheque.chequeType === 'PAYMENT_IN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmClearance(cheque.id, {
      clearedAt: clearedAt || new Date().toISOString().split('T')[0],
      clearanceReference: clearanceReference.trim() || undefined,
      clearanceNotes: clearanceNotes.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto animate-scale-in">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mark Cheque as Cleared
              </h2>
              <p className="text-xs text-slate-500">
                Confirm bank realization and update ledger balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cheque Summary Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5">
                <Landmark className="w-4 h-4" />
                <span>Cheque #{cheque.chequeNumber}</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                {cheque.payeeName}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                {cheque.bankName} • Dated: {formatDate(cheque.chequeDate)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                {isMoneyIn ? 'Deposit Amount' : 'Disbursed Amount'}
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(cheque.amount)}
              </div>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {isMoneyIn ? 'Received (Money In)' : 'Issued (Money Out)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Clearance Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bank Clearance Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={clearedAt}
                  onChange={(e) => setClearedAt(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                The date funds were realized in the bank statement.
              </p>
            </div>

            {/* Bank Reference / UTR Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bank UTR / Transaction Reference (Optional)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clearanceReference}
                  onChange={(e) => setClearanceReference(e.target.value)}
                  placeholder="e.g. UTR123456789012 / CLR-9842"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Internal Clearance Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Clearance Remarks / Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  placeholder="e.g. Verified against bank statement clearance slip."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Info Notice */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                Marking this cheque as <strong>CLEARED</strong> will confirm fund realization and maintain reconciled bank and client accounts.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Clearance</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
