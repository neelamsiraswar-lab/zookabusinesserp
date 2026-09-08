import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Landmark, 
  Calendar, 
  FileWarning, 
  Receipt, 
  RotateCcw,
  Send,
  HelpCircle
} from 'lucide-react';
import { ChequeRecord, ChequeBouncePayload, BusinessProfile } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { RBI_CTS_RETURN_REASONS } from '../../utils/chequeReminders';

interface ChequeBounceModalProps {
  isOpen: boolean;
  cheque: ChequeRecord | null;
  business: BusinessProfile;
  currencySymbol?: string;
  onClose: () => void;
  onConfirmBounce: (id: string, payload: ChequeBouncePayload) => void;
  onOpenReminderNotice?: (cheque: ChequeRecord, type: 'BOUNCED') => void;
}

export const ChequeBounceModal: React.FC<ChequeBounceModalProps> = ({
  isOpen,
  cheque,
  business,
  currencySymbol = '₹',
  onClose,
  onConfirmBounce,
  onOpenReminderNotice
}) => {
  const [bouncedAt, setBouncedAt] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedReasonCode, setSelectedReasonCode] = useState<string>('01');
  const [customReason, setCustomReason] = useState<string>('Funds Insufficient');
  const [bouncedMemoRef, setBouncedMemoRef] = useState<string>('');
  const [penaltyFee, setPenaltyFee] = useState<number>(250);
  const [autoRecordPenaltyExpense, setAutoRecordPenaltyExpense] = useState<boolean>(true);
  const [reverseLinkedInvoice, setReverseLinkedInvoice] = useState<boolean>(true);

  if (!isOpen || !cheque) return null;

  const handleReasonCodeChange = (code: string) => {
    setSelectedReasonCode(code);
    const found = RBI_CTS_RETURN_REASONS.find(r => r.code === code);
    if (found) {
      setCustomReason(found.description);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() || 
      (RBI_CTS_RETURN_REASONS.find(r => r.code === selectedReasonCode)?.label || 'Cheque Returned Unpaid');

    const payload: ChequeBouncePayload = {
      bouncedAt: bouncedAt || new Date().toISOString().split('T')[0],
      bouncedReason: finalReason,
      bouncedReasonCode: selectedReasonCode,
      bouncedMemoRef: bouncedMemoRef.trim() || undefined,
      bouncedPenaltyFee: penaltyFee > 0 ? penaltyFee : undefined,
      reverseLinkedInvoice: !!cheque.linkedInvoiceId && reverseLinkedInvoice,
      autoRecordPenaltyExpense: penaltyFee > 0 && autoRecordPenaltyExpense
    };

    onConfirmBounce(cheque.id, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto animate-scale-in">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/70 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Record Cheque Bounce / Return
              </h2>
              <p className="text-xs text-slate-500">
                Log bank return memo, penalty fees, and ledger reversal
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

        {/* Cheque Info Header */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-1.5">
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
                Cheque Value
              </div>
              <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatINR(cheque.amount)}
              </div>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                Unpaid / Returned
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Standard Return Reason Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Standard RBI Return Reason Code <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-normal text-slate-400">CTS-2010 Clearing</span>
              </label>
              <select
                value={selectedReasonCode}
                onChange={(e) => handleReasonCodeChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {RBI_CTS_RETURN_REASONS.map(reason => (
                  <option key={reason.code} value={reason.code}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom / Detailed Reason Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Detailed Return Memo Description
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                placeholder="Reason description received from bank memo..."
              />
            </div>

            {/* Two-Column Grid: Bounce Date & Bank Return Memo No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bank Bounce Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={bouncedAt}
                    onChange={(e) => setBouncedAt(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bank Return Memo Ref #
                </label>
                <div className="relative">
                  <FileWarning className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bouncedMemoRef}
                    onChange={(e) => setBouncedMemoRef(e.target.value)}
                    placeholder="e.g. MEMO/2026/9021"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Bank Bounce Penalty Fee */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Bank Return / Bounce Charges ({currencySymbol})</span>
                </label>
                <div className="w-28">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={penaltyFee || ''}
                    onChange={(e) => setPenaltyFee(Number(e.target.value))}
                    placeholder="250"
                    className="w-full px-2.5 py-1 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={autoRecordPenaltyExpense}
                  onChange={(e) => setAutoRecordPenaltyExpense(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Automatically record {formatINR(penaltyFee || 0)} under Bank Charges expense</span>
              </label>
            </div>

            {/* Reverse Linked Invoice */}
            {cheque.linkedInvoiceId && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={reverseLinkedInvoice}
                    onChange={(e) => setReverseLinkedInvoice(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Linked Invoice Outstanding
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 block mt-0.5">
                      Reverts the settled payment of {formatINR(cheque.amount)} on Invoice #{cheque.linkedInvoiceNumber || cheque.linkedInvoiceId} so customer balance reflects the unpaid debt.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              {onOpenReminderNotice ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenReminderNotice(cheque, 'BOUNCED');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Notice</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirm Bounce</span>
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
