import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileWarning, 
  Landmark, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import { ChequeRecord, BusinessProfile } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { RBI_CTS_RETURN_REASONS } from '../../utils/chequeReminders';

interface ChequeReturnMemoModalProps {
  isOpen: boolean;
  cheque: ChequeRecord | null;
  business: BusinessProfile;
  currencySymbol?: string;
  onClose: () => void;
}

export const ChequeReturnMemoModal: React.FC<ChequeReturnMemoModalProps> = ({
  isOpen,
  cheque,
  business,
  currencySymbol = '₹',
  onClose
}) => {
  if (!isOpen || !cheque || cheque.status !== 'BOUNCED') return null;

  const handlePrint = () => {
    window.print();
  };

  const reasonObj = RBI_CTS_RETURN_REASONS.find(r => r.code === cheque.bouncedReasonCode);
  const companyName = business.tradeName || business.name || 'Company Name';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto animate-scale-in">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <FileWarning className="w-5 h-5" />
            <span>Cheque Return Advice Slip (CTS-2010)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Advice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Memo Content */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 space-y-6 print:p-0 print:m-0 print:border-none">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center">
            <div className="text-xs uppercase tracking-widest font-black text-rose-700 mb-1">
              CTS-2010 CLEARING ADVICE MEMO
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              CHEQUE RETURN MEMORANDUM
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Statutory notification under Negotiable Instruments Act (Section 138 compliant)
            </p>
          </div>

          {/* Drawee / Drawer Info Header */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50 space-y-1">
              <div className="font-bold text-slate-500 uppercase text-[10px]">Drawee Bank</div>
              <div className="font-bold text-slate-900 text-sm">{cheque.bankName}</div>
              <div className="font-mono text-slate-600">A/C No: ••••{cheque.accountNumber.slice(-4)}</div>
            </div>

            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50 space-y-1 text-right">
              <div className="font-bold text-slate-500 uppercase text-[10px]">Return Advice Details</div>
              <div className="font-bold text-slate-900">Memo Ref: {cheque.bouncedMemoRef || `RET-${cheque.chequeNumber}`}</div>
              <div className="text-slate-600">Date of Return: {formatDate(cheque.bouncedAt || new Date().toISOString())}</div>
            </div>
          </div>

          {/* Cheque Specifics Table */}
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold bg-slate-100 w-1/3 text-slate-700">Cheque Number</td>
                <td className="p-2.5 font-mono font-bold text-blue-700">#{cheque.chequeNumber}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold bg-slate-100 text-slate-700">Cheque Date</td>
                <td className="p-2.5">{formatDate(cheque.chequeDate)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold bg-slate-100 text-slate-700">Payee / Beneficiary</td>
                <td className="p-2.5 font-bold uppercase">{cheque.payeeName}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold bg-slate-100 text-slate-700">Amount (in figures)</td>
                <td className="p-2.5 font-mono font-black text-rose-700 text-sm">{formatINR(cheque.amount)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2.5 font-bold bg-slate-100 text-slate-700">Amount (in words)</td>
                <td className="p-2.5 font-medium">{cheque.amountInWords || 'Amount as per instrument'}</td>
              </tr>
              {cheque.bouncedPenaltyFee && cheque.bouncedPenaltyFee > 0 && (
                <tr className="border-b border-slate-200 bg-rose-50/50">
                  <td className="p-2.5 font-bold text-rose-800">Bank Penalty Charges</td>
                  <td className="p-2.5 font-mono font-bold text-rose-700">{formatINR(cheque.bouncedPenaltyFee)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Reason for Return Box */}
          <div className="p-4 border-2 border-rose-300 rounded-xl bg-rose-50/60 space-y-1.5">
            <div className="text-[11px] uppercase font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>OFFICIAL REASON FOR RETURN / DISHONOUR:</span>
            </div>
            <div className="text-sm font-black text-slate-900">
              {reasonObj ? `${reasonObj.label}: ${reasonObj.description}` : cheque.bouncedReason}
            </div>
            {cheque.bouncedReason && reasonObj && cheque.bouncedReason !== reasonObj.description && (
              <div className="text-xs text-slate-700 italic mt-1">
                Remarks: "{cheque.bouncedReason}"
              </div>
            )}
          </div>

          {/* Footer & Authorized Signatures */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-900">{companyName}</div>
              <div className="text-[11px] text-slate-600">{business.address || ''}</div>
              <div className="text-[11px] text-slate-600">GSTIN: {business.gstin || 'N/A'}</div>
            </div>

            <div className="text-right space-y-8">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Authorized Official / Bank Branch Officer</div>
              <div className="border-t border-slate-400 pt-1 inline-block w-48 text-center text-[10px] text-slate-600">
                Seal & Signature
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
